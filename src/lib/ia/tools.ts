import { supabaseAdmin } from '@/lib/supabase';
import { mioClient } from '@/lib/mio/client';
import { canAccessModule, getAccessibleUserIdsForGlobal, getTeamMemberIds } from './permissions';
import { generateExcelReport, formatReembolsosForExcel, formatFeriasForExcel, formatAvaliacoesForExcel, formatUsuariosForExcel, formatEpisForExcel } from './excel-generator';
import { generatePDFBase64 } from './pdf-generator';
import { sendReportEmail, sendSimpleEmail, sendEmailWithNodemailer } from './email-tool';
import { msGraphClient } from './microsoft/client';

// Definição da interface das ferramentas para a OpenAI / LM Studio
export const IA_TOOLS_DEFINITION = [
  {
    type: 'function',
    function: {
      name: 'buscar_funcionario',
      description: 'Busca as informações de perfil básico de um funcionário pelo nome ou email',
      parameters: {
        type: 'object',
        properties: {
          busca: {
            type: 'string',
            description: 'Nome, sobrenome ou e-mail do funcionário para buscar',
          },
        },
        required: ['busca'],
      },
    },
// sem requireModule, liberado para todos (respeitando RBAC de dados)
  },
  {
    type: 'function',
    function: {
      name: 'buscar_dados_usuario',
      description: 'Busca dados de um funcionário de forma integrada (férias, reembolsos, calendário, EPIs, avaliações). Use "meu" para seus próprios dados, ou informe email/nome para outro usuário. Respeita permissões (USER vê só próprio, GERENTE vê equipe, ADMIN vê todos).',
      parameters: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            enum: ['ferias', 'reembolsos', 'eventos', 'epis', 'avaliacoes', 'resumo', 'todos'],
            description: 'Tipo de dado a buscar: ferias, reembolsos, eventos, epis, avaliacoes, resumo (todas pendências), todos (completo)',
          },
          usuario: {
            type: 'string',
            description: 'Identificador do usuário: "meu" para próprio, email, nome, ou CPF',
          },
        },
        required: ['tipo'],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_usuarios_global',
      description: 'Lista todos os usuários do sistema com filtros. Use esta ferramenta para ver todos os colaboradores. ADMIN vê todos, GERENTE vê apenas sua equipe.',
      parameters: {
        type: 'object',
        properties: {
          department: { type: 'string', description: 'Filtrar por departamento' },
          role: { type: 'string', description: 'Filtrar por role (ADMIN, USER, GERENTE)' },
          status: { type: 'string', description: 'Filtrar por status (active, inactive, pending)' },
          busca: { type: 'string', description: 'Buscar por nome ou email' },
          limite: { type: 'number', description: 'Limite de resultados (padrão: 50, máx: 200)' },
          ordenar_por: { type: 'string', enum: ['nome', 'department', 'created_at'], description: 'Campo para ordenação' },
          ordem: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem (asc/desc)' },
        },
        required: [],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_reembolsos_global',
      description: 'Lista todos os reembolsos do sistema com filtros. ADMIN vê todos, GERENTE vê apenas da equipe.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filtrar por status: PENDING, APPROVED, REJECTED' },
          data_inicio: { type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
          data_fim: { type: 'string', description: 'Data final (YYYY-MM-DD)' },
          departamento: { type: 'string', description: 'Filtrar por departamento do usuário' },
          categoria: { type: 'string', description: 'Filtrar por categoria do reembolso' },
          limite: { type: 'number', description: 'Limite de resultados (padrão: 100, máx: 500)' },
          ordenar_por: { type: 'string', enum: ['data', 'valor_total', 'status'], description: 'Campo para ordenação' },
          ordem: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem (asc/desc)' },
          agrupar_por: { type: 'string', enum: ['status', 'departamento', 'categoria'], description: 'Agrupar resultados' },
          incluir_totais: { type: 'boolean', description: 'Incluir totais por grupo' },
        },
        required: [],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_ferias_global',
      description: 'Lista todas as solicitações de férias com filtros. ADMIN vê todos, GERENTE vê apenas da equipe.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filtrar por status: pending, approved, cancelled' },
          data_inicio: { type: 'string', description: 'Data inicial (YYYY-MM-DD)' },
          data_fim: { type: 'string', description: 'Data final (YYYY-MM-DD)' },
          departamento: { type: 'string', description: 'Filtrar por departamento' },
          limite: { type: 'number', description: 'Limite de resultados (padrão: 100, máx: 500)' },
          ordenar_por: { type: 'string', enum: ['start_date', 'created_at', 'status'], description: 'Campo para ordenação' },
          ordem: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem (asc/desc)' },
          agrupar_por: { type: 'string', enum: ['status', 'departamento'], description: 'Agrupar resultados' },
        },
        required: [],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_ponto_global',
      description: 'Lista registros de ponto de todos os usuários com filtros. ADMIN vê todos, GERENTE vê apenas da equipe.',
      parameters: {
        type: 'object',
        properties: {
          data: { type: 'string', description: 'Data específica (YYYY-MM-DD)' },
          data_inicio: { type: 'string', description: 'Data inicial do período' },
          data_fim: { type: 'string', description: 'Data final do período' },
          departamento: { type: 'string', description: 'Filtrar por departamento' },
          limite: { type: 'number', description: 'Limite de resultados (padrão: 100, máx: 500)' },
          ordenar_por: { type: 'string', enum: ['date', 'user_id'], description: 'Campo para ordenação' },
          ordem: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem (asc/desc)' },
        },
        required: [],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_avaliacoes_global',
      description: 'Lista todas as avaliações de desempenho com filtros. ADMIN vê todos, GERENTE vê apenas da equipe.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filtrar por status: pendente, pendente_autoavaliacao, aguardando_aprovacao, aprovado' },
          periodo: { type: 'string', description: 'Filtrar por período/ano' },
          departamento: { type: 'string', description: 'Filtrar por departamento' },
          limite: { type: 'number', description: 'Limite de resultados (padrão: 50, máx: 200)' },
          ordenar_por: { type: 'string', enum: ['created_at', 'nota_final', 'status'], description: 'Campo para ordenação' },
          ordem: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem (asc/desc)' },
          agrupar_por: { type: 'string', enum: ['status', 'periodo_id', 'departamento'], description: 'Agrupar resultados' },
          incluir_totais: { type: 'boolean', description: 'Incluir totais e médias por grupo' },
        },
        required: [],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_epis_global',
      description: 'Lista todos os EPIs distribuídos com filtros. ADMIN vê todos, GERENTE vê apenas da equipe.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filtrar por status: active, returned, expired' },
          tipo: { type: 'string', description: 'Filtrar por tipo de EPI' },
          departamento: { type: 'string', description: 'Filtrar por departamento' },
          data_inicio: { type: 'string', description: 'Data inicial de entrega' },
          data_fim: { type: 'string', description: 'Data final de entrega' },
          limite: { type: 'number', description: 'Limite de resultados (padrão: 100, máx: 500)' },
          ordenar_por: { type: 'string', enum: ['delivery_date', 'user_id', 'status'], description: 'Campo para ordenação' },
          ordem: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem (asc/desc)' },
          agrupar_por: { type: 'string', enum: ['status', 'tipo', 'departamento'], description: 'Agrupar resultados' },
        },
        required: [],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_compras_global',
      description: 'Lista todas as solicitações e pedidos de compra com filtros. ADMIN vê todos, GERENTE vê apenas da equipe.',
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['requests', 'orders'], description: 'Tipo: requests (solicitações) ou orders (pedidos)' },
          status: { type: 'string', description: 'Filtrar por status' },
          data_inicio: { type: 'string', description: 'Data inicial' },
          data_fim: { type: 'string', description: 'Data final' },
          departamento: { type: 'string', description: 'Filtrar por departamento' },
          limite: { type: 'number', description: 'Limite de resultados (padrão: 50, máx: 200)' },
          ordenar_por: { type: 'string', enum: ['created_at', 'total_amount', 'status'], description: 'Campo para ordenação' },
          ordem: { type: 'string', enum: ['asc', 'desc'], description: 'Ordem (asc/desc)' },
          agrupar_por: { type: 'string', enum: ['status', 'departamento'], description: 'Agrupar resultados' },
        },
        required: [],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'gerar_planilha_excel',
      description: 'Gera uma planilha Excel com os dados filtrados. Pode enviar por email ou retornar base64.',
      parameters: {
        type: 'object',
        properties: {
          tipo_dados: {
            type: 'string',
            enum: ['reembolsos', 'ferias', 'ponto', 'avaliacoes', 'epis', 'compras', 'usuarios', 'eventos', 'cursos'],
            description: 'Tipo de dados para a planilha',
          },
          filtros: { type: 'object', description: 'FiltrosapplyGlobalAccessFilter para os dados (same as *_global tools)' },
          titulo: { type: 'string', description: 'Título da planilha' },
          destino: { type: 'string', enum: ['download', 'email'], description: 'Destination: download (base64) ou email' },
          email_destino: { type: 'string', description: 'Email para enviar a planilha (se destino=email)' },
        },
        required: ['tipo_dados', 'destino'],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'gerar_relatorio_pdf',
      description: 'Gera um relatório em PDF com os dados filtrados, formatado com o padrão ABZ Group.',
      parameters: {
        type: 'object',
        properties: {
          tipo_dados: {
            type: 'string',
            enum: ['reembolsos', 'ferias', 'ponto', 'avaliacoes', 'epis', 'compras', 'usuarios', 'resumo'],
            description: 'Tipo de dados para o relatório',
          },
          filtros: { type: 'object', description: 'Filtros para os dados' },
          titulo: { type: 'string', description: 'Título do relatório' },
          periodo: { type: 'object', properties: { inicio: { type: 'string' }, fim: { type: 'string' } }, description: 'Período do relatório' },
          incluir_graficos: { type: 'boolean', description: 'Incluir gráficos no PDF' },
          destino: { type: 'string', enum: ['download', 'email'], description: 'Destination: download (base64) ou email' },
          email_destino: { type: 'string', description: 'Email para enviar o relatório (se destino=email)' },
        },
        required: ['tipo_dados', 'destino'],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'enviar_email_relatorio',
      description: 'Envia um email com relatório ou dados anexados. Suporta enviar por Microsoft Graph.',
      parameters: {
        type: 'object',
        properties: {
          para: { type: 'string', description: 'Email do destinatário' },
          assunto: { type: 'string', description: 'Assunto do email' },
          corpo: { type: 'string', description: 'Corpo do email (pode ser HTML)' },
          anexo_tipo: { type: 'string', enum: ['xlsx', 'pdf', 'csv', 'json'], description: 'Tipo do anexo' },
          dados_anexo: { type: 'object', description: 'Dados a incluir no anexo (será gerado automaticamente)' },
          titulo_anexo: { type: 'string', description: 'Nome do arquivo anexo' },
        },
        required: ['para', 'assunto', 'corpo'],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'analisar_tendencias',
      description: 'Analisa tendências e gera insights sobre os dados. Identifica padrões e sugere ações.',
      parameters: {
        type: 'object',
        properties: {
          tipo_analise: {
            type: 'string',
            enum: ['reembolsos', 'ferias', 'avaliacoes', 'epis', 'geral'],
            description: 'Tipo de análise a realizar',
          },
          periodo: { type: 'string', description: 'Período para análise (últimos 30 dias, último mês, etc)' },
          grupo: { type: 'string', enum: ['departamento', 'status', 'categoria'], description: 'Agrupar análise por' },
        },
        required: ['tipo_analise'],
      },
    },
    adminOnly: false,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_ferias',
      description: 'Busca as informações de férias de um funcionário específico usando seu ID',
      parameters: {
        type: 'object',
        properties: {
          funcionario_id: {
            type: 'string',
            description: 'ID (UUID) do funcionário',
          },
        },
        required: ['funcionario_id'],
      },
    },
    requireModule: 'ferias',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_reembolsos',
      description: 'Busca o total de reembolsos e valores de um funcionário específico',
      parameters: {
        type: 'object',
        properties: {
          funcionario_id: {
            type: 'string',
            description: 'ID (UUID) do funcionário',
          },
        },
        required: ['funcionario_id'],
      },
    },
    requireModule: 'reembolsos',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_escala_mio',
      description: 'Busca a escala (man schedule) de um funcionário específico no sistema MIO',
      parameters: {
        type: 'object',
        properties: {
          cpf: {
            type: 'string',
            description: 'CPF do funcionário para buscar a escala (apenas números)',
          },
        },
        required: ['cpf'],
      },
    },
    requireModule: 'man-schedule',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_treinamentos_mio',
      description: 'Busca os treinamentos e vencimentos de um funcionário no sistema MIO',
      parameters: {
        type: 'object',
        properties: {
          cpf: {
            type: 'string',
            description: 'CPF do funcionário (apenas números)',
          },
        },
        required: ['cpf'],
      },
    },
    requireModule: 'man-schedule',
  },
  {
    type: 'function',
    function: {
      name: 'ler_email_funcionario',
      description: 'Lê os últimos 5 e-mails da caixa de entrada corporativa de um funcionário. Apenas ADMIN pode usar isso.',
      parameters: {
        type: 'object',
        properties: {
          email_corporativo: {
            type: 'string',
            description: 'E-mail corporativo completo do funcionário (@groupabz.com)',
          },
        },
        required: ['email_corporativo'],
      },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_epis',
      description: 'Busca a lista de Equipamentos de Proteção Individual (EPIs) vinculados a um funcionário.',
      parameters: {
        type: 'object',
        properties: {
          funcionario_id: {
            type: 'string',
            description: 'ID (UUID) do funcionário',
          },
        },
        required: ['funcionario_id'],
      },
    },
    requireModule: 'epi',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_avaliacoes_desempenho',
      description: 'Busca o histórico de avaliações de desempenho de um funcionário.',
      parameters: {
        type: 'object',
        properties: {
          funcionario_id: {
            type: 'string',
            description: 'ID (UUID) do funcionário',
          },
        },
        required: ['funcionario_id'],
      },
    },
    requireModule: 'avaliacoes_desempenho',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_documento_corporativo',
      description: 'Busca documentos corporativos (manuais, políticas, procedimentos) pela biblioteca do portal por título ou categoria.',
      parameters: {
        type: 'object',
        properties: {
          termo_pesquisa: {
            type: 'string',
            description: 'Termo de busca para o título ou descrição do documento',
          },
          categoria: {
            type: 'string',
            description: 'Categoria opcional para filtrar (ex: "politica", "manual", "procedimento")',
          },
        },
        required: ['termo_pesquisa'],
      },
    },
    requireModule: 'biblioteca',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_noticias_recentes',
      description: 'Busca as últimas notícias corporativas publicadas no portal da ABZ Group.',
      parameters: {
        type: 'object',
        properties: {
          limite: {
            type: 'number',
            description: 'Número máximo de notícias a retornar (padrão: 5)',
          },
        },
        required: [],
      },
    },
    // sem requireModule — notícias são visíveis para todos
  },
  {
    type: 'function',
    function: {
      name: 'buscar_eventos_calendario',
      description: 'Busca os próximos eventos do calendário corporativo. Pode usar email ou ID do usuário.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Email corporativo do usuário (ex: nome@groupabz.com). Use em vez do ID.',
          },
          dias_futuros: {
            type: 'number',
            description: 'Quantidade de dias a frente para buscar eventos (padrão: 7)',
          },
        },
        required: ['email'],
      },
    },
    // sem requireModule — calendário é geral
  },
  {
    type: 'function',
    function: {
      name: 'buscar_kpis_sistema',
      description: 'Retorna KPIs globais do sistema: total de usuários, sessões de IA, solicitações pendentes de férias e reembolsos. Apenas ADMIN.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'verificar_falhas_integracao_erp',
      description: 'Verifica falhas recentes nas integrações do portal (MIO, Poliweb, etc). Apenas ADMIN.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_solicitacoes_compra',
      description: 'Busca solicitações de compra do usuário ou gerais se for administrador.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filtrar por status (ex: "pending", "approved", "rejected")',
          },
          limite: {
            type: 'number',
            description: 'Limite de resultados (padrão: 5)',
          },
        },
        required: [],
      },
    },
    requireModule: 'suprimentos',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_pedidos_compra',
      description: 'Busca pedidos de compra realizados.',
      parameters: {
        type: 'object',
        properties: {
          limite: {
            type: 'number',
            description: 'Limite de resultados (padrão: 5)',
          },
        },
        required: [],
      },
    },
    requireModule: 'suprimentos',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_fornecedores',
      description: 'Pesquisa fornecedores cadastrados no sistema por nome ou categoria.',
      parameters: {
        type: 'object',
        properties: {
          termo: {
            type: 'string',
            description: 'Nome ou categoria do fornecedor',
          },
        },
        required: ['termo'],
      },
    },
    requireModule: 'suprimentos',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_cursos_disponiveis',
      description: 'Lista os cursos disponíveis na Academy.',
      parameters: {
        type: 'object',
        properties: {
          categoria: {
            type: 'string',
            description: 'Filtrar por categoria de curso',
          },
        },
        required: [],
      },
    },
    requireModule: 'academy',
  },
  {
    type: 'function',
    function: {
      name: 'buscar_progresso_academy',
      description: 'Busca o progresso do usuário logado nos cursos da Academy.',
      parameters: {
        type: 'object',
        properties: {
          curso_id: {
            type: 'string',
            description: 'ID opcional de um curso específico para ver o detalhe do progresso',
          },
        },
        required: [],
      },
    },
    requireModule: 'academy',
  },
  // =====================================================
  // Microsoft Graph - Novas Ferramentas por Categoria
  // =====================================================
  {
    type: 'function',
    function: {
      name: 'listar_contatos_outlook',
      description: 'Lista contatos do Outlook de um usuário. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        email: { type: 'string', description: 'Email corporativo do usuário' },
        limite: { type: 'number', description: 'Limite de resultados (padrão: 20)' },
      }, required: ['email'] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_grupos_365',
      description: 'Lista grupos do Microsoft 365 da organização. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        limite: { type: 'number', description: 'Limite de resultados (padrão: 50)' },
      }, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_membros_grupo',
      description: 'Lista membros de um grupo do Microsoft 365. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        grupo_id: { type: 'string', description: 'ID do grupo' },
      }, required: ['grupo_id'] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_info_organizacao',
      description: 'Busca informações da organização (domínios, país, etc). Apenas ADMIN.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_alertas_seguranca',
      description: 'Lista alertas de segurança do Microsoft 365. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        limite: { type: 'number', description: 'Limite de alertas (padrão: 20)' },
      }, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_incidentes_seguranca',
      description: 'Lista incidentes de segurança. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        limite: { type: 'number', description: 'Limite (padrão: 10)' },
      }, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_logs_auditoria',
      description: 'Busca logs de auditoria e sign-ins do Azure AD. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        tipo: { type: 'string', enum: ['audit', 'signin'], description: 'Tipo: audit (auditoria) ou signin (logins)' },
        limite: { type: 'number', description: 'Limite (padrão: 20)' },
      }, required: ['tipo'] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'listar_aplicacoes_azure',
      description: 'Lista aplicações registradas no Azure AD. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        limite: { type: 'number', description: 'Limite (padrão: 50)' },
      }, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'listar_dispositivos',
      description: 'Lista dispositivos gerenciados pelo Azure AD. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        limite: { type: 'number', description: 'Limite (padrão: 50)' },
      }, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_sites_sharepoint',
      description: 'Busca/lista sites do SharePoint. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        busca: { type: 'string', description: 'Termo de busca (opcional)' },
      }, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'listar_cadernos_onenote',
      description: 'Lista cadernos do OneNote de um usuário. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        email: { type: 'string', description: 'Email do usuário' },
      }, required: ['email'] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_tarefas_todo',
      description: 'Lista listas de tarefas do Microsoft To Do de um usuário. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        email: { type: 'string', description: 'Email do usuário' },
      }, required: ['email'] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_reunioes_online',
      description: 'Lista reuniões online (Teams meetings) de um usuário. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        email: { type: 'string', description: 'Email do usuário' },
      }, required: ['email'] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_canais_teams',
      description: 'Lista canais de uma equipe do Teams. Apenas ADMIN.',
      parameters: { type: 'object', properties: {
        team_id: { type: 'string', description: 'ID da equipe (team)' },
      }, required: ['team_id'] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_status_servicos_365',
      description: 'Verifica o status de saúde dos serviços Microsoft 365 e incidentes ativos. Apenas ADMIN.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    adminOnly: true,
  },
  {
    type: 'function',
    function: {
      name: 'buscar_reviews_acesso',
      description: 'Lista access reviews de governança de identidade. Apenas ADMIN.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
    adminOnly: true,
  },
  // =====================================================
  // AGENTE PROATIVO — Novas ferramentas
  // =====================================================
  {
    type: 'function',
    function: {
      name: 'pesquisar_emails_outlook',
      description: 'Busca avançada de e-mails no Outlook via Microsoft Graph. Permite filtros por remetente, assunto, data, pasta e mais. Retorna até 50 resultados. Use para buscar e-mails específicos quando o usuário pedir.',
      parameters: {
        type: 'object',
        properties: {
          email_usuario: { type: 'string', description: 'E-mail do usuário cujos e-mails serão pesquisados' },
          consulta: { type: 'string', description: 'Texto livre para busca nos e-mails (assunto e corpo)' },
          de: { type: 'string', description: 'Filtrar por remetente (e-mail)' },
          assunto: { type: 'string', description: 'Filtrar por assunto (contém)' },
          data_inicio: { type: 'string', description: 'Data início (YYYY-MM-DD)' },
          data_fim: { type: 'string', description: 'Data fim (YYYY-MM-DD)' },
          pasta: { type: 'string', description: 'Pasta específica (inbox, sentitems, drafts)' },
          limite: { type: 'number', description: 'Quantidade máxima de resultados (padrão: 20, máx: 50)' },
        },
        required: ['email_usuario'],
      },
    },
    adminOnly: true,
    featureToggle: 'email_search',
  },
  {
    type: 'function',
    function: {
      name: 'enviar_email_outlook',
      description: 'Envia um e-mail via conta corporativa do Microsoft 365 (Outlook). Permite enviar e-mails em nome do usuário usando a API Graph.',
      parameters: {
        type: 'object',
        properties: {
          email_remetente: { type: 'string', description: 'E-mail do remetente (quem envia)' },
          destinatarios: { type: 'string', description: 'E-mails dos destinatários separados por vírgula' },
          assunto: { type: 'string', description: 'Assunto do e-mail' },
          corpo: { type: 'string', description: 'Corpo do e-mail em HTML' },
          copia: { type: 'string', description: 'E-mails em cópia (CC) separados por vírgula' },
        },
        required: ['email_remetente', 'destinatarios', 'assunto', 'corpo'],
      },
    },
    adminOnly: true,
    featureToggle: 'email_send',
  },
  {
    type: 'function',
    function: {
      name: 'criar_nota_corporativa',
      description: 'Cria uma nota no OneNote corporativo ou uma tarefa no Microsoft To Do do usuário.',
      parameters: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['onenote', 'todo'], description: 'Tipo: onenote (criar página) ou todo (criar tarefa)' },
          email_usuario: { type: 'string', description: 'E-mail do usuário no Microsoft 365' },
          titulo: { type: 'string', description: 'Título da nota ou tarefa' },
          conteudo: { type: 'string', description: 'Conteúdo da nota (HTML) ou descrição da tarefa' },
          data_vencimento: { type: 'string', description: 'Data de vencimento para tarefas To Do (YYYY-MM-DD)' },
          importancia: { type: 'string', enum: ['low', 'normal', 'high'], description: 'Importância da tarefa' },
        },
        required: ['tipo', 'email_usuario', 'titulo'],
      },
    },
    adminOnly: false,
    featureToggle: 'onenote_create',
  },
  {
    type: 'function',
    function: {
      name: 'agendar_tarefa_agente',
      description: 'Agenda uma tarefa de monitoramento periódico para o agente IA. Pode ser verificação de KPIs, lembretes ou prompts customizados. Use expressões cron para definir a frequência.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome descritivo da tarefa' },
          tipo: { type: 'string', enum: ['kpi_check', 'reminder', 'report', 'custom'], description: 'Tipo: kpi_check (monitorar KPIs), reminder (lembrete), report (gerar relatório), custom (prompt livre)' },
          prompt: { type: 'string', description: 'Instrução/mensagem do que o agente deve fazer ou enviar' },
          cron: { type: 'string', description: 'Expressão cron (ex: "50 7 * * 1-5" para 7:50 seg-sex, "0 14 * * 1-5" para 14:00 seg-sex)' },
          usuarios_alvo: { type: 'string', description: 'IDs ou e-mails dos usuários alvo separados por vírgula (opcional)' },
          roles_alvo: { type: 'string', description: 'Roles dos usuários alvo: ADMIN, GERENTE, USER (separados por vírgula)' },
          canais: { type: 'string', description: 'Canais de notificação: push, email, portal (separados por vírgula). Padrão: push,email' },
          max_execucoes: { type: 'number', description: 'Número máximo de execuções (opcional, sem limite se omitido)' },
        },
        required: ['nome', 'tipo', 'prompt', 'cron'],
      },
    },
    adminOnly: true,
    featureToggle: 'scheduled_tasks',
  },
  {
    type: 'function',
    function: {
      name: 'analisar_kpis_negocio',
      description: 'Analisa os KPIs de performance e soluções do portal, comparando valores atuais com metas definidas. Identifica anomalias e sugere ações. Dados incluem: avaliações, férias, reembolsos, EPIs.',
      parameters: {
        type: 'object',
        properties: {
          departamento: { type: 'string', description: 'Filtrar análise por departamento específico (opcional)' },
          tipo_kpi: { type: 'string', enum: ['performance', 'solucoes', 'todos'], description: 'Tipo de KPI: performance (avaliações), solucoes (ações/entregas), todos' },
        },
        required: [],
      },
    },
    adminOnly: false,
    featureToggle: 'kpi_analysis',
  },
  {
    type: 'function',
    function: {
      name: 'enviar_notificacao_proativa',
      description: 'Envia uma notificação proativa para um ou mais usuários via push, e-mail e/ou popup do portal. Use para lembretes, alertas e acompanhamento de tarefas.',
      parameters: {
        type: 'object',
        properties: {
          usuarios: { type: 'string', description: 'IDs dos usuários alvo separados por vírgula' },
          titulo: { type: 'string', description: 'Título da notificação' },
          mensagem: { type: 'string', description: 'Corpo da mensagem' },
          canais: { type: 'string', description: 'Canais: push, email, portal (separados por vírgula). Padrão: push,portal' },
          prioridade: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Prioridade da notificação' },
          url_acao: { type: 'string', description: 'URL para redirecionar o usuário ao clicar (opcional)' },
        },
        required: ['usuarios', 'titulo', 'mensagem'],
      },
    },
    adminOnly: false,
    featureToggle: 'proactive_notifications',
  },
  {
    type: 'function',
    function: {
      name: 'gerenciar_base_conhecimento',
      description: 'Gerencia a base de conhecimento persistente da IA. Permite adicionar, buscar, atualizar e remover informações que a IA deve lembrar sobre o usuário, a empresa ou os processos.',
      parameters: {
        type: 'object',
        properties: {
          acao: { type: 'string', enum: ['adicionar', 'buscar', 'listar', 'atualizar', 'remover'], description: 'Ação a executar na base de conhecimento' },
          titulo: { type: 'string', description: 'Título da entrada (para adicionar/atualizar)' },
          conteudo: { type: 'string', description: 'Conteúdo da informação (para adicionar/atualizar)' },
          categoria: { type: 'string', description: 'Categoria: preferencias, processos, regras, notas, geral (para adicionar)' },
          escopo: { type: 'string', enum: ['global', 'user', 'department'], description: 'Escopo: global (todos), user (só este usuário), department (departamento)' },
          tags: { type: 'string', description: 'Tags separadas por vírgula (para adicionar/buscar)' },
          busca: { type: 'string', description: 'Termo para buscar na base (para buscar)' },
          id: { type: 'string', description: 'ID da entrada (para atualizar/remover)' },
        },
        required: ['acao'],
      },
    },
    adminOnly: false,
    featureToggle: 'knowledge_base',
  },
];

/**
 * Obtém a lista de ferramentas disponíveis para um usuário com base em suas permissões
 */
export async function getAvailableTools(userId: string, role: string) {
  const availableTools = [];
  const effectiveRole = role === 'ADMIN' ? 'ADMIN' : (role === 'GERENTE' ? 'GERENTE' : 'USER');

  // Cache de feature toggles para esta chamada
  let featureTogglesCache: Record<string, { is_enabled: boolean; allowed_roles: string[] }> | null = null;

  async function checkFeatureToggle(featureKey: string): Promise<boolean> {
    if (!featureTogglesCache) {
      try {
        const { data } = await supabaseAdmin
          .from('ia_feature_toggles')
          .select('feature_key, is_enabled, allowed_roles');
        featureTogglesCache = {};
        for (const toggle of (data || [])) {
          featureTogglesCache[toggle.feature_key] = {
            is_enabled: toggle.is_enabled,
            allowed_roles: toggle.allowed_roles || [],
          };
        }
      } catch {
        featureTogglesCache = {};
      }
    }

    const toggle = featureTogglesCache[featureKey];
    if (!toggle) return true; // Se não existe toggle, liberar
    if (!toggle.is_enabled) return false;
    if (toggle.allowed_roles.length > 0 && !toggle.allowed_roles.includes(effectiveRole)) return false;
    return true;
  }

  for (const tool of IA_TOOLS_DEFINITION) {
    // Se ferramenta é adminOnly, só ADMIN pode usar
    if (tool.adminOnly && role !== 'ADMIN') {
      continue;
    }

    // Se ferramenta requer TeamAccess (dados da equipe), precisa ser ADMIN ou GERENTE
    if ((tool as any).requireTeamAccess && effectiveRole === 'USER') {
      continue;
    }

    // Verificar feature toggle
    if ((tool as any).featureToggle) {
      const enabled = await checkFeatureToggle((tool as any).featureToggle);
      if (!enabled) continue;
    }

    if (tool.requireModule) {
      const hasAccess = await canAccessModule(userId, tool.requireModule);
      if (!hasAccess) continue;
    }

    // Remove propriedades customizadas antes de enviar para o modelo
    const { requireModule, adminOnly, requireTeamAccess, featureToggle, ...cleanTool } = tool as any;
    availableTools.push(cleanTool);
  }

  return availableTools;
}

/**
 * Executa a ferramenta solicitada pelo modelo
 */
export async function executeToolCall(name: string, args: any, userRole: string, userId: string): Promise<string> {
  console.log(`[IA Tools] Executando ferramenta: ${name} com args:`, args);

  try {
    switch (name) {
      case 'buscar_funcionario': {
        const { busca } = args;
        const baseSelect = 'id, first_name, last_name, email, role, department, position';
        // Construção de query com suporte a múltiplos tokens (p.ex. "Caio Correia")
        let queryBuilder = supabaseAdmin.from('users_unified').select(baseSelect);

        if (busca && busca.trim()) {
          const tokens = busca.trim().split(/\s+/);
          if (tokens.length >= 2) {
            const t1 = tokens[0];
            const t2 = tokens.slice(1).join(' ');
            queryBuilder = queryBuilder
              .or(`first_name.ilike.%${t1}%,last_name.ilike.%${t2}%`)
              .or(`first_name.ilike.%${t2}%,last_name.ilike.%${t1}%`)
              .or(`email.ilike.%${busca}%,first_name.ilike.%${busca}%,last_name.ilike.%${busca}%`);
          } else {
            queryBuilder = queryBuilder
              .or(`first_name.ilike.%${busca}%,last_name.ilike.%${busca}%,email.ilike.%${busca}%`);
          }
        }

        const { data, error } = await queryBuilder;
        if (error) return `Erro ao buscar funcionário: ${error.message}`;
        if (!data || data.length === 0) {
          // Fallback: tente localizar o usuário via Microsoft Graph com base no displayName (busca)
          try {
            const MS_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || '';
            const MS_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || '';
            const MS_TENANT_ID = process.env.MS_GRAPH_TENANT_ID || 'common';

            if (MS_CLIENT_ID && MS_CLIENT_SECRET) {
              const params = new URLSearchParams({
                client_id: MS_CLIENT_ID,
                client_secret: MS_CLIENT_SECRET,
                scope: 'https://graph.microsoft.com/.default',
                grant_type: 'client_credentials',
              });

              const tokenRes = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
              });

              const tokenData = await tokenRes.json();
              if (tokenData.access_token) {
                const displayNameQuery = encodeURIComponent(busca);
                const graphRes = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName,'${busca}')&$top=5&$select=id,displayName,mail,userPrincipalName`, {
                  headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                });

                if (graphRes.ok) {
                  const graphData = await graphRes.json();
                  const value = graphData.value || [];
                  if (value.length > 0) {
                    const gUser = value[0];
                    const candidateEmail = gUser.mail || gUser.userPrincipalName;
                    if (candidateEmail) {
                      const internal = await supabaseAdmin
                        .from('users_unified')
                        .select('id, first_name, last_name, email, role, department, position')
                        .eq('email', candidateEmail)
                        .maybeSingle();
                      if (internal && internal.data) {
                        return JSON.stringify([internal.data]);
                      }
                      // fallback: retornar dados do Graph quando não houver correspondência interna
                      return JSON.stringify(value.map((u: any) => ({ id: u.id, email: u.mail || u.userPrincipalName, displayName: u.displayName })));
                    }
                  }
                }
              }
            }
          } catch {
            // ignore e cai no retorno padrão abaixo
          }
          return `Nenhum funcionário encontrado com o termo "${busca}".`;
        }
return JSON.stringify(data);
      }

      case 'buscar_dados_usuario': {
        const { tipo, usuario } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const { resolveUserIdByIdentifier, canAccessUserData } = await import('./permissions');

        let targetUserId: string;
        if (!usuario || usuario === 'meu' || usuario === 'minhas' || usuario === 'meus') {
          targetUserId = userId;
        } else {
          const resolvedId = await resolveUserIdByIdentifier(usuario);
          targetUserId = resolvedId || '';
          if (!targetUserId) {
            return `Usuário não encontrado: "${usuario}". Use "meu" para seus próprios dados ou informe email/nome/CPF válido.`;
          }
        }

        const hasAccess = await canAccessUserData(userId, effectiveRole, targetUserId);
        if (!hasAccess) {
          return `Você não tem permissão para ver dados deste usuário.`;
        }

        const { data: targetUser } = await supabaseAdmin
          .from('users_unified')
          .select('first_name, last_name, email, role, department, position')
          .eq('id', targetUserId)
          .single();

        const userName = targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : 'Desconhecido';
        const userEmail = targetUser?.email || '';
        const userRoleTarget = targetUser?.role || '';

        const result: any = {
          usuario: {
            nome: userName,
            email: userEmail,
            cargo: targetUser?.position || 'N/A',
            departamento: targetUser?.department || 'N/A',
            role: userRoleTarget,
          }
        };

        if (tipo === 'ferias' || tipo === 'resumo' || tipo === 'todos') {
          const { data: ferias } = await supabaseAdmin
            .from('leave_requests')
            .select('id, start_date, end_date, status, reason, created_at')
            .eq('user_id', targetUserId)
            .order('start_date', { ascending: false })
            .limit(20);

          const pendentes = ferias?.filter(f => f.status === 'PENDING_LEADER' || f.status === 'PENDING_MANAGER') || [];
          const aprovadas = ferias?.filter(f => f.status === 'APPROVED') || [];
          const canceladas = ferias?.filter(f => f.status === 'CANCELLED') || [];

          result.ferias = {
            pendentes: pendentes.map(f => ({
              id: f.id,
              inicio: f.start_date,
              fim: f.end_date,
              motivo: f.reason,
              solicitacao: f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : null
            })),
            aprovadas: aprovadas.map(f => ({
              id: f.id,
              inicio: f.start_date,
              fim: f.end_date,
              motivo: f.reason
            })),
            canceladas: canceladas.length,
            total: ferias?.length || 0
          };
        }

        if (tipo === 'reembolsos' || tipo === 'resumo' || tipo === 'todos') {
          const { data: userData } = await supabaseAdmin
            .from('users_unified')
            .select('email')
            .eq('id', targetUserId)
            .single();
          
          const userEmail = userData?.email;
          
          const { data: reembolsos } = userEmail 
            ? await supabaseAdmin
                .from('Reimbursement')
                .select('id, status, valorTotal, descricao, data, categoria')
                .eq('email', userEmail)
                .order('data', { ascending: false })
                .limit(20)
            : { data: null };

          const pendentes = reembolsos?.filter(r => r.status === 'pendente') || [];
          const aprovados = reembolsos?.filter(r => r.status === 'aprovado') || [];
          const rejeitados = reembolsos?.filter(r => r.status === 'rejeitado') || [];

          const totalPendente = pendentes.reduce((sum, r) => sum + (parseFloat(r.valorTotal) || 0), 0);
          const totalAprovado = aprovados.reduce((sum, r) => sum + (parseFloat(r.valorTotal) || 0), 0);

          result.reembolsos = {
            pendentes: pendentes.map(r => ({
              id: r.id,
              descricao: r.descricao,
              valor: r.valorTotal,
              data: r.data,
              categoria: r.categoria
            })),
            aprovados: aprovados.map(r => ({
              id: r.id,
              descricao: r.descricao,
              valor: r.valorTotal,
              data: r.data,
              categoria: r.categoria
            })),
            rejeitados: rejeitados.length,
            total_pendente: totalPendente,
            total_aprovado: totalAprovado
          };
        }

        if (tipo === 'eventos' || tipo === 'resumo' || tipo === 'todos') {
          const hoje = new Date().toISOString();
          const futuro30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const { data: eventos } = await supabaseAdmin
            .from('calendar_events')
            .select('id, summary, description, start_time, end_time, location, attendees')
            .eq('user_id', targetUserId)
            .gte('start_time', hoje)
            .lte('start_time', futuro30)
            .order('start_time', { ascending: true })
            .limit(20);

          const proximos7 = eventos?.filter(e => new Date(e.start_time) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) || [];

          result.eventos = {
            proximos_7_dias: proximos7.map(e => ({
              id: e.id,
              titulo: e.summary,
              descricao: e.description,
              inicio: e.start_time,
              fim: e.end_time,
              local: e.location,
              participantes: e.attendees?.length || 0
            })),
            proximos_30_dias: eventos?.map(e => ({
              id: e.id,
              titulo: e.summary,
              inicio: e.start_time,
              fim: e.end_time,
              local: e.location
            })) || [],
            total: eventos?.length || 0
          };
        }

        if (tipo === 'epis' || tipo === 'resumo' || tipo === 'todos') {
          const { data: epis } = await supabaseAdmin
            .from('epi_registrations')
            .select('id, delivery_date, status, return_date, justification, epi_types(name, ca_number)')
            .eq('user_id', targetUserId)
            .order('delivery_date', { ascending: false })
            .limit(20);

          const ativos = epis?.filter(e => e.status === 'active' || e.status === 'delivered') || [];
          const devolvidos = epis?.filter(e => e.status === 'returned') || [];

          result.epis = {
            ativos: ativos.map(e => ({
              id: e.id,
              tipo: Array.isArray(e.epi_types) ? e.epi_types[0]?.name : e.epi_types?.name || 'N/A',
              ca: Array.isArray(e.epi_types) ? e.epi_types[0]?.ca_number : e.epi_types?.ca_number || 'N/A',
              entrega: e.delivery_date,
              status: e.status
            })),
            devolvidos: devolvidos.map(e => ({
              id: e.id,
              tipo: Array.isArray(e.epi_types) ? e.epi_types[0]?.name : e.epi_types?.name || 'N/A',
              entrega: e.delivery_date,
              devolucao: e.return_date
            })),
            total: epis?.length || 0
          };
        }

        if (tipo === 'avaliacoes' || tipo === 'resumo' || tipo === 'todos') {
          const { data: avaliacoes } = await supabaseAdmin
            .from('avaliacoes_desempenho')
            .select('id, nota_final, status, periodo_id, created_at')
            .eq('colaborador_id', targetUserId)
            .order('created_at', { ascending: false })
            .limit(10);

          const pendentes = avaliacoes?.filter(a => a.status === 'pendente' || a.status === 'pending' || a.status === 'pendente_autoavaliacao') || [];
          const concluidas = avaliacoes?.filter(a => a.status === 'aprovado' || a.status === 'completed' || a.status === 'aprovada') || [];

          const mediaNota = avaliacoes?.filter(a => a.nota_final != null)
            .reduce((sum, a, _, arr) => sum + (a.nota_final || 0) / arr.length, 0) || null;

          result.avaliacoes = {
            pendentes: pendentes.map(a => ({
              id: a.id,
              periodo: a.periodo_id,
              nota: a.nota_final,
              status: a.status,
              data: a.created_at
            })),
            concluidas: concluidas.map(a => ({
              id: a.id,
              periodo: a.periodo_id,
              nota: a.nota_final,
              status: a.status,
              data: a.created_at
            })),
            media_nota: mediaNota ? Math.round(mediaNota * 100) / 100 : null,
            total: avaliacoes?.length || 0
          };
        }

        if (tipo === 'resumo') {
          const pendencias: string[] = [];
          if (result.ferias?.pendentes?.length > 0) {
            pendencias.push(`${result.ferias.pendentes.length} férias pendente(s)`);
          }
          if (result.reembolsos?.pendentes?.length > 0) {
            pendencias.push(`${result.reembolsos.pendentes.length} reembolso(s) pendente(s) - R$ ${result.reembolsos.total_pendente.toLocaleString('pt-BR')}`);
          }
          if (result.eventos?.proximos_7_dias?.length > 0) {
            pendencias.push(`${result.eventos.proximos_7_dias.length} evento(s) nos próximos 7 dias`);
          }
          if (result.avaliacoes?.pendentes?.length > 0) {
            pendencias.push(`${result.avaliacoes.pendentes.length} avaliação(ões) pendente(s)`);
          }

          result.resumo_geral = {
            total_pendencias: pendencias.length,
            pendencias: pendencias,
            mensagem: pendencias.length > 0
              ? `Você tem ${pendencias.length} pendência(s): ${pendencias.join(', ')}.`
              : 'Nenhuma pendência encontrada. Tudo em dia!'
          };
        }

        return JSON.stringify(result);
      }

      case 'buscar_usuarios_global': {
        const { department, role, status, busca, limite = 50, ordenar_por = 'first_name', ordem = 'asc' } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        let query = supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name, email, role, department, position, status, created_at');

        if (accessInfo.ids) {
          query = query.in('id', accessInfo.ids);
        }

        if (department) query = query.ilike('department', `%${department}%`);
        if (role) query = query.eq('role', role.toUpperCase());
        if (status) query = query.eq('status', status);
        if (busca) {
          query = query.or(`first_name.ilike.%${busca}%,last_name.ilike.%${busca}%,email.ilike.%${busca}%`);
        }

        query = query.order(ordenar_por, { ascending: ordem === 'asc' }).limit(Math.min(limite, 200));

        const { data, error } = await query;
        if (error) return `Erro ao buscar usuários: ${error.message}`;

        const formattedData = (data || []).map((u: any) => ({
          id: u.id,
          nome: `${u.first_name} ${u.last_name}`.trim(),
          email: u.email,
          role: u.role,
          department: u.department,
          position: u.position,
          status: u.status,
          created_at: u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : null,
        }));

        return ***REMOVED***
          total: formattedData.length,
          usuarios: formattedData,
          filtros_aplicados: { department, role, status, busca },
        });
      }

      case 'buscar_reembolsos_global': {
        const { status, data_inicio, data_fim, departamento, categoria, limite = 100, ordenar_por = 'data', ordem = 'desc', agrupar_por, incluir_totais } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        let query = supabaseAdmin
          .from('Reimbursement')
          .select('id, user_id, status, valorTotal, descricao, data, categoria, created_at');

        if (accessInfo.ids) {
          query = query.in('user_id', accessInfo.ids);
        }

        if (status) query = query.eq('status', status.toLowerCase());
        if (data_inicio) query = query.gte('data', data_inicio);
        if (data_fim) query = query.lte('data', data_fim);
        if (categoria) query = query.ilike('categoria', `%${categoria}%`);

        query = query.order(ordenar_por, { ascending: ordem === 'asc' }).limit(Math.min(limite, 500));

        const { data: reembolsos, error } = await query;
        if (error) return `Erro ao buscar reembolsos: ${error.message}`;

        const userIds = [...new Set((reembolsos || []).map((r: any) => r.user_id))];
        const { data: usuarios } = await supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name, email, department')
          .in('id', userIds);

        const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));

        const formattedData = (reembolsos || []).map((r: any) => {
          const u = userMap.get(r.user_id);
          return {
            id: r.id,
            usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A',
            email: u?.email || 'N/A',
            departamento: u?.department || 'N/A',
            descricao: r.descricao,
            categoria: r.categoria,
            valor: r.valorTotal || '',
            status: r.status,
            data: r.data,
          };
        });

        let result: any = { total: formattedData.length, reembolsos: formattedData };

        if (agrupar_por && incluir_totais) {
          const grouped: Record<string, { count: number; total: number }> = {};
          for (const r of formattedData) {
            const key = r[agrupar_por] || 'Sem grupo';
            if (!grouped[key]) grouped[key] = { count: 0, total: 0 };
            grouped[key].count++;
            grouped[key].total += Number(r.valor || 0);
          }
          result.totais_por_grupo = Object.entries(grouped).map(([k, v]) => ({ grupo: k, quantidade: v.count, total: v.total }));
        }

        return JSON.stringify(result);
      }

      case 'buscar_ferias_global': {
        const { status, data_inicio, data_fim, departamento, limite = 100, ordenar_por = 'start_date', ordem = 'desc', agrupar_por } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        let query = supabaseAdmin
          .from('leave_requests')
          .select('id, user_id, start_date, end_date, status, reason, created_at');

        if (accessInfo.ids) {
          query = query.in('user_id', accessInfo.ids);
        }

        if (status) query = query.eq('status', status.toLowerCase());
        if (data_inicio) query = query.gte('start_date', data_inicio);
        if (data_fim) query = query.lte('start_date', data_fim);

        query = query.order(ordenar_por, { ascending: ordem === 'asc' }).limit(Math.min(limite, 500));

        const { data: ferias, error } = await query;
        if (error) return `Erro ao buscar férias: ${error.message}`;

        const userIds = [...new Set((ferias || []).map((f: any) => f.user_id))];
        const { data: usuarios } = await supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name, email, department')
          .in('id', userIds);

        const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));

        const formattedData = (ferias || []).map((f: any) => {
          const u = userMap.get(f.user_id);
          const start = new Date(f.start_date);
          const end = new Date(f.end_date);
          const dias = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return {
            id: f.id,
            usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A',
            email: u?.email || 'N/A',
            departamento: u?.department || 'N/A',
            start_date: f.start_date,
            end_date: f.end_date,
            dias,
            status: f.status,
            reason: f.reason,
          };
        });

        let result: any = { total: formattedData.length, ferias: formattedData };

        if (agrupar_por) {
          const grouped: Record<string, number> = {};
          for (const f of formattedData) {
            const key = f[agrupar_por] || 'Sem grupo';
            grouped[key] = (grouped[key] || 0) + 1;
          }
          result.agrupado_por = grouped;
        }

        return JSON.stringify(result);
      }

      case 'buscar_avaliacoes_global': {
        const { status, periodo, departamento, limite = 50, ordenar_por = 'created_at', ordem = 'desc', agrupar_por, incluir_totais } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        let query = supabaseAdmin
          .from('avaliacoes_desempenho')
          .select('id, colaborador_id, nota_final, status, periodo_id, created_at');

        if (accessInfo.ids) {
          query = query.in('colaborador_id', accessInfo.ids);
        }

        if (status) query = query.eq('status', status);
        if (periodo) query = query.ilike('periodo_id', `%${periodo}%`);

        query = query.order(ordenar_por, { ascending: ordem === 'asc' }).limit(Math.min(limite, 200));

        const { data: avaliacoes, error } = await query;
        if (error) return `Erro ao buscar avaliações: ${error.message}`;

        const userIds = [...new Set((avaliacoes || []).map((a: any) => a.colaborador_id))];
        const { data: usuarios } = await supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name, email, department')
          .in('id', userIds);

        const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));

        const formattedData = (avaliacoes || []).map((a: any) => {
          const u = userMap.get(a.colaborador_id);
          return {
            id: a.id,
            usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A',
            email: u?.email || 'N/A',
            departamento: u?.department || 'N/A',
            periodo: a.periodo_id,
            nota: a.nota_final,
            status: a.status,
            created_at: a.created_at,
          };
        });

        let result: any = { total: formattedData.length, avaliacoes: formattedData };

        if (incluir_totais) {
          const notasValidas = formattedData.filter((a: any) => a.nota != null).map((a: any) => a.nota);
          const media = notasValidas.length > 0 ? notasValidas.reduce((a: number, b: number) => a + b, 0) / notasValidas.length : null;
          result.media_nota = media ? Math.round(media * 100) / 100 : null;
        }

        if (agrupar_por) {
          const grouped: Record<string, number> = {};
          for (const a of formattedData) {
            const key = a[agrupar_por] || 'Sem grupo';
            grouped[key] = (grouped[key] || 0) + 1;
          }
          result.agrupado_por = grouped;
        }

        return JSON.stringify(result);
      }

      case 'buscar_epis_global': {
        const { status, tipo, departamento, data_inicio, data_fim, limite = 100, ordenar_por = 'delivery_date', ordem = 'desc', agrupar_por } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        let query = supabaseAdmin
          .from('epi_registrations')
          .select('id, user_id, delivery_date, status, return_date, epi_types(name, ca_number), justification');

        if (accessInfo.ids) {
          query = query.in('user_id', accessInfo.ids);
        }

        if (status) query = query.eq('status', status.toLowerCase());
        if (data_inicio) query = query.gte('delivery_date', data_inicio);
        if (data_fim) query = query.lte('delivery_date', data_fim);

        query = query.order(ordenar_por, { ascending: ordem === 'asc' }).limit(Math.min(limite, 500));

        const { data: epis, error } = await query;
        if (error) return `Erro ao buscar EPIs: ${error.message}`;

        const userIds = [...new Set((epis || []).map((e: any) => e.user_id))];
        const { data: usuarios } = await supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name, email, department')
          .in('id', userIds);

        const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));

        const formattedData = (epis || []).map((e: any) => {
          const u = userMap.get(e.user_id);
          return {
            id: e.id,
            usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A',
            email: u?.email || 'N/A',
            departamento: u?.department || 'N/A',
            tipo_epi: e.epi_types?.name || 'N/A',
            ca: e.epi_types?.ca_number || 'N/A',
            delivery_date: e.delivery_date,
            return_date: e.return_date,
            status: e.status,
            justification: e.justification,
          };
        });

        let result: any = { total: formattedData.length, epis: formattedData };

        if (agrupar_por) {
          const grouped: Record<string, number> = {};
          for (const e of formattedData) {
            const key = e[agrupar_por] || 'Sem grupo';
            grouped[key] = (grouped[key] || 0) + 1;
          }
          result.agrupado_por = grouped;
        }

        return JSON.stringify(result);
      }

      case 'buscar_compras_global': {
        const { tipo = 'requests', status, data_inicio, data_fim, departamento, limite = 50, ordenar_por = 'created_at', ordem = 'desc', agrupar_por } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        const table = tipo === 'orders' ? 'purchase_orders' : 'purchase_requests';

        let query = supabaseAdmin
          .from(table)
          .select('*');

        if (accessInfo.ids) {
          if (tipo === 'orders') {
            query = query.or(`user_id.in.(${accessInfo.ids.join(',')}),approver_ids.cs.{${accessInfo.ids.join(',')}}`);
          } else {
            query = query.in('created_by', accessInfo.ids);
          }
        }

        if (status) query = query.eq('status', status);
        if (data_inicio) query = query.gte('created_at', data_inicio);
        if (data_fim) query = query.lte('created_at', data_fim);

        query = query.order(ordenar_, { ascending: ordem === 'asc' }).limit(Math.min(limite, 200));

        const { data: compras, error } = await query;
        if (error) return `Erro ao buscar compras: ${error.message}`;

        const formattedData = (compras || []).map((c: any) => ({
          id: c.id,
          numero: c.rqf_number || c.po_number || c.id,
          tipo: tipo === 'orders' ? 'Pedido' : 'Solicitação',
          status: c.status,
          valor: c.total_amount || c.valor_total,
          descricao: c.description || c.descricao,
          created_at: c.created_at,
          created_by: c.created_by,
        }));

        let result: any = { total: formattedData.length, compras: formattedData };

        if (agrupar_por && agrupar_por !== 'created_by') {
          const grouped: Record<string, number> = {};
          for (const c of formattedData) {
            const key = c[agrupar_por] || 'Sem grupo';
            grouped[key] = (grouped[key] || 0) + 1;
          }
          result.agrupado_por = grouped;
        }

        return JSON.stringify(result);
      }

      case 'gerar_planilha_excel': {
        const { tipo_dados, filtros = {}, titulo, destino, email_destino } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        let data: any[] = [];
        let columns: any[] = [];
        let periodo = { inicio: '', fim: '' };

        switch (tipo_dados) {
          case 'reembolsos': {
            let query = supabaseAdmin.from('Reimbursement').select('id, user_id, status, valorTotal, descricao, data, categoria');
            if (accessInfo.ids) query = query.in('user_id', accessInfo.ids);
            if (filtros.status) query = query.eq('status', filtros.status.toLowerCase());
            if (filtros.data_inicio) query = query.gte('data', filtros.data_inicio);
            if (filtros.data_fim) query = query.lte('data', filtros.data_fim);
            const { data: reemb } = await query.order('data', { ascending: false }).limit(500);
            const userIds = [...new Set((reemb || []).map((r: any) => r.user_id))];
            const { data: usuarios } = await supabaseAdmin.from('users_unified').select('id, first_name, last_name, department').in('id', userIds);
            const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));
            data = (reemb || []).map((r: any) => {
              const u = userMap.get(r.user_id);
              return { usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A', email: u?.email, departamento: u?.department, ...r };
            });
            const formatted = formatReembolsosForExcel(data);
            columns = formatted.columns;
            periodo = { inicio: filtros.data_inicio || 'Início', fim: filtros.data_fim || 'Atual' };
            break;
          }
          case 'ferias': {
            let query = supabaseAdmin.from('leave_requests').select('id, user_id, start_date, end_date, status, reason');
            if (accessInfo.ids) query = query.in('user_id', accessInfo.ids);
            if (filtros.status) query = query.eq('status', filtros.status.toLowerCase());
            const { data: fer } = await query.order('start_date', { ascending: false }).limit(500);
            const userIds = [...new Set((fer || []).map((f: any) => f.user_id))];
            const { data: usuarios } = await supabaseAdmin.from('users_unified').select('id, first_name, last_name, email, department').in('id', userIds);
            const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));
            data = (fer || []).map((f: any) => {
              const u = userMap.get(f.user_id);
              const start = new Date(f.start_date);
              const end = new Date(f.end_date);
              const dias = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return { usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A', email: u?.email, departamento: u?.department, ...f, dias };
            });
            const formatted = formatFeriasForExcel(data);
            columns = formatted.columns;
            break;
          }
          case 'avaliacoes': {
            let query = supabaseAdmin.from('avaliacoes_desempenho').select('id, colaborador_id, nota_final, status, periodo_id, created_at');
            if (accessInfo.ids) query = query.in('colaborador_id', accessInfo.ids);
            if (filtros.status) query = query.eq('status', filtros.status);
            const { data: avals } = await query.order('created_at', { ascending: false }).limit(200);
            const userIds = [...new Set((avals || []).map((a: any) => a.colaborador_id))];
            const { data: usuarios } = await supabaseAdmin.from('users_unified').select('id, first_name, last_name, email, department').in('id', userIds);
            const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));
            data = (avals || []).map((a: any) => {
              const u = userMap.get(a.colaborador_id);
              return { usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A', email: u?.email, departamento: u?.department, ...a };
            });
            const formatted = formatAvaliacoesForExcel(data);
            columns = formatted.columns;
            break;
          }
          case 'usuarios': {
            let query = supabaseAdmin.from('users_unified').select('id, first_name, last_name, email, role, department, position, status, created_at');
            if (accessInfo.ids) query = query.in('id', accessInfo.ids);
            if (filtros.department) query = query.ilike('department', `%${filtros.department}%`);
            const { data: users } = await query.order('first_name').limit(200);
            data = (users || []).map((u: any) => ({ nome: `${u.first_name} ${u.last_name}`.trim(), ...u }));
            const formatted = formatUsuariosForExcel(data);
            columns = formatted.columns;
            break;
          }
          case 'epis': {
            let query = supabaseAdmin.from('epi_registrations').select('id, user_id, delivery_date, status, epi_types(name, ca_number)');
            if (accessInfo.ids) query = query.in('user_id', accessInfo.ids);
            const { data: epiData } = await query.order('delivery_date', { ascending: false }).limit(500);
            const userIds = [...new Set((epiData || []).map((e: any) => e.user_id))];
            const { data: usuarios } = await supabaseAdmin.from('users_unified').select('id, first_name, last_name, email, department').in('id', userIds);
            const userMap = new Map((usuarios || []).map((u: any) => [u.id, u]));
            data = (epiData || []).map((e: any) => {
              const u = userMap.get(e.user_id);
              return { usuario: u ? `${u.first_name} ${u.last_name}`.trim() : 'N/A', email: u?.email, departamento: u?.department, tipo_epi: e.epi_types?.name, ca: e.epi_types?.ca_number, ...e };
            });
            const formatted = formatEpisForExcel(data);
            columns = formatted.columns;
            break;
          }
          default:
            return `Tipo de dados não suportado para planilha: ${tipo_dados}`;
        }

        const buffer = generateExcelReport(data, columns, {
          titulo: titulo || `Relatório de ${tipo_dados}`,
          periodo,
          gerarPor: userId,
        });

        const base64 = buffer.toString('base64');
        const filename = `${titulo || tipo_dados}_${new Date().toISOString().split('T')[0]}.xlsx`;
        const totalValor = data.reduce((sum: number, r: any) => sum + (parseFloat(r.valor) || 0), 0);

        // Se destino for email, enviar realmente
        if (destino === 'email' && email_destino) {
          const summary = `Total de ${data.length} registros${totalValor > 0 ? ` | Valor Total: R$ ${totalValor.toFixed(2)}` : ''}`;
          const emailResult = await sendReportEmail(
            email_destino,
            titulo || `Relatório de ${tipo_dados}`,
            tipo_dados,
            base64,
            filename,
            summary
          );

          if (emailResult.success) {
            return ***REMOVED***
              success: true,
              message: `✅ Planilha gerada com ${data.length} registros eenviada para ${email_destino}!`,
              formato: 'xlsx',
              registros: data.length,
              valor_total: totalValor,
              destino: 'email',
              email_enviado: email_destino,
              message_id: emailResult.messageId,
              base64_preview: base64.substring(0, 100) + '...',
            });
          } else {
            return ***REMOVED***
              success: false,
              message: `Planilha gerada masfalha ao enviar email: ${emailResult.error}`,
              formato: 'xlsx',
              base64: base64,
              filename: filename,
              registros: data.length,
              erro_email: emailResult.error,
            });
          }
        }

        // Retornar base64 para download
        return ***REMOVED***
          success: true,
          message: `✅ Planilha gerada com ${data.length} registros`,
          formato: 'xlsx',
          base64: base64,
          filename: filename,
          registros: data.length,
          valor_total: totalValor,
          tamanho_bytes: buffer.length,
          instrucao: 'O base64 abaixo pode ser decodificado para obter o arquivo Excel',
        });
      }

      case 'gerar_relatorio_pdf': {
        const { tipo_dados, filtros = {}, titulo, periodo, destino, email_destino } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        console.log('[IA Tools] Gerando relatório PDF real:', { tipo_dados, destino, email_destino });

        let dados: any[] = [];
        let pdfBase64 = '';
        let totalValor = 0;

        try {
          switch (tipo_dados) {
            case 'resumo':
            case 'reembolsos': {
              let query = supabaseAdmin.from('Reimbursement').select('id, user_id, status, valorTotal, data, descricao, categoria');
              if (accessInfo.ids) query = query.in('user_id', accessInfo.ids);
              if (filtros.status) query = query.eq('status', filtros.status.toLowerCase());
              const { data: reemb } = await query.limit(500);
              
              const userIds = [...new Set((reemb || []).map((r: any) => r.user_id))];
              const { data: usuarios } = await supabaseAdmin.from('users_unified').select('id, first_name, department').in('id', userIds);
              const userMap = new Map((usuarios || []).map((u: any) => [u.id, `${u.first_name}`]));
              
              dados = (reemb || []).map((r: any) => ({
                usuario: userMap.get(r.user_id) || 'Unknown',
                departamento: 'Geral',
                descricao: r.descricao || '-',
                categoria: r.categoria || '-',
                valor: r.valorTotal || 0,
                status: r.status || '-',
                data: r.data || '-',
              }));
              
              totalValor = (reemb || []).reduce((sum: number, r: any) => sum + (parseFloat(r.valorTotal) || 0), 0);
              break;
            }
            case 'ferias': {
              let query = supabaseAdmin.from('leave_requests').select('id, user_id, start_date, end_date, status');
              if (accessInfo.ids) query = query.in('user_id', accessInfo.ids);
              const { data: ferias } = await query.limit(500);
              
              const userIds = [...new Set((ferias || []).map((f: any) => f.user_id))];
              const { data: usuarios } = await supabaseAdmin.from('users_unified').select('id, first_name, department').in('id', userIds);
              const userMap = new Map((usuarios || []).map((u: any) => [u.id, `${u.first_name}`]));
              
              dados = (ferias || []).map((f: any) => ({
                usuario: userMap.get(f.user_id) || 'Unknown',
                departamento: 'Geral',
                start_date: f.start_date || '-',
                end_date: f.end_date || '-',
                dias: f.start_date && f.end_date ? Math.ceil((new Date(f.end_date).getTime() - new Date(f.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
                status: f.status || '-',
              }));
              break;
            }
            case 'avaliacoes': {
              let query = supabaseAdmin.from('avaliacoes_desempenho').select('id, colaborador_id, nota_final, status, periodo_id, data_inicio, data_fim');
              if (accessInfo.ids) query = query.in('colaborador_id', accessInfo.ids);
              const { data: avals } = await query.limit(500);
              
              const userIds = [...new Set((avals || []).map((a: any) => a.colaborador_id))];
              const { data: usuarios } = await supabaseAdmin.from('users_unified').select('id, first_name, department').in('id', userIds);
              const userMap = new Map((usuarios || []).map((u: any) => [u.id, `${u.first_name}`]));
              
              dados = (avals || []).map((a: any) => ({
                usuario: userMap.get(a.colaborador_id) || 'Unknown',
                nota: a.nota_final || '-',
                status: a.status || '-',
                periodo: a.periodo_id || '-',
                data_inicio: a.data_inicio || '-',
                data_fim: a.data_fim || '-',
              }));
              break;
            }
            case 'usuarios': {
              if (effectiveRole !== 'ADMIN') {
                return 'Acesso negado. Apenas administradores podem gerar relatórios de usuários.';
              }
              const { data: users } = await supabaseAdmin.from('users_unified').select('id, first_name, last_name, email, department, position, status').limit(500);
              dados = (users || []).map((u: any) => ({
                nome: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
                email: u.email || '-',
                departamento: u.department || '-',
                cargo: u.position || '-',
                status: u.status || '-',
              }));
              break;
            }
            default:
              return `Tipo de relatório não suportado: ${tipo_dados}`;
          }

          // Gerar PDF de verdade
          const reportTitulo = titulo || `Relatório de ${tipo_dados}`;
          console.log('[IA Tools] Gerando PDF com', dados.length, 'registros');
          
          // Gerar PDF usando a função existente
          pdfBase64 = generatePDFBase64(dados, tipo_dados as any, {
            titulo: reportTitulo,
            periodo: periodo,
            gerarPor: userId,
            incluirGraficos: false,
          });

          console.log('[IA Tools] PDF gerado, tamanho base64:', pdfBase64.length);

          // Se destino for email, enviar
          if (destino === 'email' && email_destino) {
            console.log('[IA Tools] Enviando email para:', email_destino);
            
            const summary = tipo_dados === 'reembolsos' || tipo_dados === 'resumo' 
              ? `Total de registros: ${dados.length} | Valor Total: R$ ${totalValor.toFixed(2).replace('.', ',')}`
              : `Total de registros: ${dados.length}`;

            const result = await sendReportEmail(
              email_destino,
              reportTitulo,
              tipo_dados,
              pdfBase64,
              `${reportTitulo.replace(/\s+/g, '_')}.pdf`,
              summary
            );

            if (result.success) {
              return ***REMOVED***
                success: true,
                message: `✅ Relatório PDF enviado com sucesso para ${email_destino}!`,
                tipo: tipo_dados,
                registros: dados.length,
                valor_total: totalValor,
                destino: 'email',
                destinatario: email_destino,
                message_id: result.messageId,
              });
            } else {
              return ***REMOVED***
                success: false,
                error: `Falha ao enviar email: ${result.error}`,
                tipo: tipo_dados,
                registros: dados.length,
                // Fallback: retornar base64
                pdf_base64: pdfBase64.substring(0, 100) + '...',
              });
            }
          }

          // Se destino for download, retornar base64
          return ***REMOVED***
            success: true,
            message: `✅ Relatório PDF gerado com sucesso!`,
            tipo: tipo_dados,
            registros: dados.length,
            valor_total: totalValor,
            destino: 'download',
            pdf_base64: pdfBase64,
            tamanho_bytes: Math.ceil(pdfBase64.length * 0.75),
            instrucao: 'O base64 pode ser decodificado para obter o arquivo PDF. Use: atob(base64) em JavaScript ou salve em arquivo com decodificação base64.',
          });

        } catch (err) {
          console.error('[IA Tools] Erro ao gerar relatório:', err);
          return ***REMOVED***
            success: false,
            error: `Erro ao gerar relatório: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      case 'enviar_email_relatorio': {
        const { para, assunto, corpo, dados_anexo, titulo_anexo, anexo_tipo } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        if (effectiveRole !== 'ADMIN') {
          return 'Acesso negado. Apenas administradores podem enviar emails.';
        }

        console.log('[IA Tools] Enviando email real para:', para);

        try {
          let attachments: any[] = [];

          // Se tem dados de anexo, gerar o arquivo
          if (dados_anexo && titulo_anexo) {
            if (anexo_tipo === 'xlsx' || titulo_anexo.endsWith('.xlsx')) {
              // Gerar Excel
              const excelBase64 = generateExcelReport(dados_anexo, 'resumo');
              attachments.push({
                filename: titulo_anexo,
                content: excelBase64,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              });
            } else if (anexo_tipo === 'pdf' || titulo_anexo.endsWith('.pdf')) {
              // Gerar PDF
              const pdfBase64 = generatePDFBase64(dados_anexo, 'resumo', {
                titulo: titulo_anexo.replace('.pdf', ''),
                gerarPor: userId,
              });
              attachments.push({
                filename: titulo_anexo,
                content: pdfBase64,
                contentType: 'application/pdf',
              });
            }
          }

          // Enviar email usando nodemailer diretamente
          const result = await sendEmailWithNodemailer({
            to: para,
            subject: assunto,
            html: corpo,
            attachments: attachments.length > 0 ? attachments : undefined,
          });

          if (result.success) {
            return ***REMOVED***
              success: true,
              message: `✅ Email enviado com sucesso para ${para}!`,
              destinatario: para,
              assunto,
              message_id: result.messageId,
              has_attachments: attachments.length > 0,
            });
          } else {
            return ***REMOVED***
              success: false,
              error: `Falha ao enviar email: ${result.error}`,
              destinatario: para,
              assunto,
            });
          }
        } catch (err) {
          console.error('[IA Tools] Erro ao enviar email:', err);
          return `Erro ao enviar email: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      case 'analisar_tendencias': {
        const { tipo_analise, periodo, grupo } = args;
        const effectiveRole = userRole === 'ADMIN' ? 'ADMIN' : (userRole === 'GERENTE' ? 'GERENTE' : 'USER');

        const accessInfo = await getAccessibleUserIdsForGlobal(userId, effectiveRole);
        if (!accessInfo.hasAccess) {
          return accessInfo.error || 'Acesso negado';
        }

        const insights: string[] = [];

        if (tipo_analise === 'reembolsos' || tipo_analise === 'geral') {
          const { data: reemb } = await supabaseAdmin
            .from('Reimbursement')
            .select('status, valorTotal')
            .in('user_id', accessInfo.ids || [])
            .limit(500);

          const pendentes = (reemb || []).filter((r: any) => r.status === 'pendente');
          const totalPendente = pendentes.reduce((sum: number, r: any) => sum + (parseFloat(r.valorTotal) || 0), 0);
          const aprovados = (reemb || []).filter((r: any) => r.status === 'aprovado');

          if (pendentes.length > 10) {
            insights.push(`⚠️ Há ${pendentes.length} reembolsos pendentes totalizando R$ ${totalPendente.toLocaleString('pt-BR')}. Considere verificar com os aprovadores.`);
          }
          if (aprovados.length > 0) {
            insights.push(`✅ ${aprovados.length} reembolsos foram aprovados recentemente.`);
          }
        }

        if (tipo_analise === 'ferias' || tipo_analise === 'geral') {
          const { data: ferias } = await supabaseAdmin
            .from('leave_requests')
            .select('status')
            .in('user_id', accessInfo.ids || [])
            .limit(500);

          const pendentes = (ferias || []).filter((f: any) => f.status === 'pending');
          if (pendentes.length > 5) {
            insights.push(`📅 ${pendentes.length} solicitações de férias aguardando aprovação.`);
          }
        }

        if (tipo_analise === 'avaliacoes' || tipo_analise === 'geral') {
          const { data: avals } = await supabaseAdmin
            .from('avaliacoes_desempenho')
            .select('status, nota_final')
            .in('colaborador_id', accessInfo.ids || [])
            .limit(200);

          const pendentes = (avals || []).filter((a: any) => a.status === 'pendente' || a.status === 'pendente_autoavaliacao');
          if (pendentes.length > 0) {
            insights.push(`📊 ${pendentes.length} avaliações de desempenho pendentes.`);
          }

          const notas = (avals || []).filter((a: any) => a.nota_final != null).map((a: any) => a.nota_final);
          if (notas.length > 0) {
            const media = notas.reduce((a: number, b: number) => a + b, 0) / notas.length;
            insights.push(`📈 Média de notas das avaliações: ${media.toFixed(2)}`);
          }
        }

        if (insights.length === 0) {
          insights.push('📊 Não foram detectados padrões significativos no período analisado.');
        }

        return ***REMOVED***
          tipo_analise,
          periodo: periodo || 'Últimos 30 dias',
          insights,
          gerado_em: new Date().toLocaleString('pt-BR'),
          sugerir_relatorio: insights.length > 0,
        });
      }

      case 'buscar_ferias': {
        const { funcionario_id } = args;
        const { data, error } = await supabaseAdmin
          .from('leave_requests')
          .select('start_date, end_date, status, reason')
          .eq('user_id', funcionario_id)
          .order('start_date', { ascending: false })
          .limit(10);
          
        if (error) return `Erro ao buscar férias: ${error.message}`;
        if (!data || data.length === 0) return `Nenhuma solicitação de férias encontrada para este funcionário.`;
        return JSON.stringify(data);
      }

      case 'buscar_reembolsos': {
        // Suporte a múltiplos identificadores: funcionario_id (UUID), cpf ou email
        const { funcionario_id, cpf, email } = args || {};

        // Resolve userId a partir de qualquer identificador disponível
        let userId = funcionario_id;

        if (!userId) {
          if (cpf) {
            const { data, error } = await supabaseAdmin
              .from('users_unified')
              .select('id')
              .eq('cpf', cpf)
              .maybeSingle();
            if (error || !data) {
              return `Erro ao buscar reembolsos: usuário com CPF não encontrado.`;
            }
            userId = data.id;
          } else if (email) {
            const { data, error } = await supabaseAdmin
              .from('users_unified')
              .select('id')
              .eq('email', email)
              .maybeSingle();
            if (error || !data) {
              return `Erro ao buscar reembolsos: usuário com email não encontrado.`;
            }
            userId = data.id;
          }
        }

        if (!userId) {
          return `Erro: informe o ID do funcionário (UUID) ou forneça CPF/email válido para resolução automática.`;
        }

        // Validação básica de UUID (optativa, apenas para evitar queries desastrosas)
        const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (userId && !uuidPattern.test(userId)) {
          // Não vale a pena quebrar; apenas avisa o usuário e tenta prosseguir com a consulta, o que pode falhar de forma elegante
          // return `Erro: UUID inválido.`;
        }

const { data, error } = await supabaseAdmin
          .from('Reimbursement')
          .select('status, valor_total, descricao, data')
          .eq('user_id', userId)
          .order('data', { ascending: false })
          .limit(10);
          
        if (error) return `Erro ao buscar reembolsos: ${error.message}`;
        if (!data || data.length === 0) return `Nenhuma solicitação de reembolso encontrada para este funcionário.`;
        return JSON.stringify(data);
      }
      
      case 'buscar_escala_mio': {
        const { cpf } = args;
        const cleanCpf = cpf.replace(/\D/g, '');
        const embarques = await mioClient.getEmbarques(cleanCpf);
        
        if (!embarques || embarques.length === 0) {
          return `Nenhuma escala ou embarque encontrado no MIO para o CPF fornecido.`;
        }
        
        return JSON.stringify(embarques.slice(0, 5)); // Retorna os 5 registros mais relevantes
      }

      case 'buscar_treinamentos_mio': {
        const { cpf } = args;
        const cleanCpf = cpf.replace(/\D/g, '');
        const treinamentos = await mioClient.getTreinamentos(cleanCpf);
        
        if (!treinamentos || treinamentos.length === 0) {
          return `Nenhum treinamento encontrado no MIO para o CPF fornecido.`;
        }
        
        return JSON.stringify(treinamentos.slice(0, 10)); // Retorna até 10 treinamentos
      }

      case 'ler_email_funcionario': {
        if (userRole !== 'ADMIN') {
          return `Acesso negado. Apenas administradores podem ler e-mails de outros funcionários.`;
        }
        
        const { email_corporativo } = args;
        // Usar msGraphClient.searchEmails sem limite fixo de 5
        try {
          const emails = await msGraphClient.searchEmails(email_corporativo, undefined, { top: 25 });
          if (emails.length === 0) return `A caixa de entrada de ${email_corporativo} está vazia ou inacessível.`;
          return JSON.stringify(emails.map(e => ({
            subject: e.subject,
            from: (e.from as any)?.emailAddress?.name || (e.from as any)?.emailAddress?.address || 'Desconhecido',
            date: new Date(e.receivedDateTime).toLocaleString('pt-BR'),
            preview: e.bodyPreview,
            isRead: e.isRead,
            hasAttachments: e.hasAttachments,
          })));
        } catch (err) {
          // Fallback para método antigo
          return await getGlobalUserEmails(email_corporativo);
        }
      }

      case 'buscar_epis': {
        const { funcionario_id } = args;
        const { data, error } = await supabaseAdmin
          .from('epi_registrations')
          .select('id, delivery_date, status, return_date, epi_types(name, ca_number), justification')
          .eq('user_id', funcionario_id)
          .order('delivery_date', { ascending: false })
          .limit(10);
          
        if (error) return `Erro ao buscar EPIs: ${error.message}`;
        if (!data || data.length === 0) return `Nenhum EPI encontrado para este funcionário.`;
        return JSON.stringify(data);
      }

      case 'buscar_avaliacoes_desempenho': {
        const { funcionario_id } = args;
        const { data, error } = await supabaseAdmin
          .from('avaliacoes_desempenho')
          .select('id, nota_final, status, periodo_id, created_at')
          .eq('colaborador_id', funcionario_id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) return `Erro ao buscar avaliações: ${error.message}`;
        if (!data || data.length === 0) return `Nenhuma avaliação de desempenho encontrada para este funcionário.`;
        return JSON.stringify(data);
      }

      case 'buscar_documento_corporativo': {
        const { termo_pesquisa, categoria } = args;
        
        // 1. Buscar no Portal ABZ
        let query = supabaseAdmin
          .from('documents')
          .select('id, title, description, category, subcategory, file_url, created_at')
          .or(`title.ilike.%${termo_pesquisa}%,description.ilike.%${termo_pesquisa}%`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (categoria) {
          query = query.ilike('category', `%${categoria}%`);
        }

        const { data: portalDocs } = await query;
        const portalResults = (portalDocs || []).map((d: any) => ({
          fonte: 'Portal ABZ',
          título: d.title,
          descrição: d.description,
          categoria: d.category,
          subcategoria: d.subcategory,
          link: d.file_url,
          publicado_em: new Date(d.created_at).toLocaleDateString('pt-BR'),
        }));

        // 2. Buscar no SharePoint via Graph (fallback)
        let spResults: any[] = [];
        try {
          const spFiles = await msGraphClient.searchOneDriveFiles(termo_pesquisa);
          spResults = spFiles.slice(0, 5).map((f: any) => ({
            fonte: 'SharePoint / OneDrive',
            título: f.name,
            descrição: f.description || '',
            link: f.webUrl,
            tamanho: f.size ? `${(f.size / 1024).toFixed(1)} KB` : '',
          }));
        } catch { /* SharePoint indisponível, continuar com portal */ }

        const allResults = [...portalResults, ...spResults];
        if (allResults.length === 0) return `Nenhum documento encontrado com o termo "${termo_pesquisa}".`;
        return JSON.stringify(allResults);
      }

      case 'buscar_noticias_recentes': {
        const limite = Math.min(args.limite || 5, 10);
        const { data, error } = await supabaseAdmin
          .from('news')
          .select('id, title, summary, published_at, created_at')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .limit(limite);

        if (error) return `Erro ao buscar notícias: ${error.message}`;
        if (!data || data.length === 0) return `Nenhuma notícia publicada encontrada.`;
        return JSON.stringify(data.map((n: any) => ({
          título: n.title,
          resumo: n.summary,
          publicado_em: n.published_at
            ? new Date(n.published_at).toLocaleDateString('pt-BR')
            : new Date(n.created_at).toLocaleDateString('pt-BR'),
        })));
      }

      case 'buscar_eventos_calendario': {
        const { email, dias_futuros } = args;
        
        // ABORDAGEM HÍBRIDA: Tenta Graph primeiro, fallback para portal
        const days = dias_futuros || 7;
        let graphEvents: any[] = [];
        let portalEvents: any[] = [];

        // 1. Tentar Microsoft Graph (calendário corporativo)
        try {
          const graphData = await msGraphClient.listCalendarEvents(email, days);
          graphEvents = graphData.map((e: any) => ({
            fonte: 'Microsoft 365',
            título: e.subject,
            descrição: e.bodyPreview || '',
            início: e.start?.dateTime ? new Date(e.start.dateTime).toLocaleString('pt-BR') : '',
            fim: e.end?.dateTime ? new Date(e.end.dateTime).toLocaleString('pt-BR') : '',
            local: e.location?.displayName || '',
            organizador: e.organizer?.emailAddress?.name || '',
            online: !!e.isOnlineMeeting,
          }));
        } catch { /* Graph indisponível */ }

        // 2. Buscar no portal ABZ (calendário interno)
        try {
          let resolvedUserId = null;
          if (email) {
            const { data: userData } = await supabaseAdmin
              .from('users_unified')
              .select('id')
              .eq('email', email.toLowerCase())
              .limit(1);
            if (userData && userData.length > 0) resolvedUserId = userData[0].id;
          }
          
          if (resolvedUserId) {
            const hoje = new Date().toISOString();
            const futuro = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

            const { data } = await supabaseAdmin
              .from('calendar_events')
              .select('id, summary, description, start_time, end_time, location')
              .eq('user_id', resolvedUserId)
              .gte('start_time', hoje)
              .lte('start_time', futuro)
              .order('start_time', { ascending: true })
              .limit(15);

            portalEvents = (data || []).map((e: any) => ({
              fonte: 'Portal ABZ',
              título: e.summary,
              descrição: e.description,
              início: new Date(e.start_time).toLocaleString('pt-BR'),
              fim: e.end_time ? new Date(e.end_time).toLocaleString('pt-BR') : null,
              local: e.location,
            }));
          }
        } catch { /* Portal indisponível */ }

        const allEvents = [...graphEvents, ...portalEvents];
        if (allEvents.length === 0) return `Nenhum evento encontrado nos próximos ${days} dias.`;
        return JSON.stringify(allEvents);
      }

      case 'buscar_kpis_sistema': {
        if (userRole !== 'ADMIN') return `Acesso negado. Apenas administradores podem acessar KPIs do sistema.`;

        const [
          { count: totalUsuarios },
          { count: totalSessoes },
          { count: feriaspen },
          { count: reembolsopen },
        ] = await Promise.all([
          supabaseAdmin.from('users_unified').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('ia_chat_sessions').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabaseAdmin.from('Reimbursement').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        ]);

        return ***REMOVED***
          total_usuarios: totalUsuarios,
          total_sessoes_ia: totalSessoes,
          ferias_pendentes: feriaspen,
          reembolsos_pendentes: reembolsopen,
          gerado_em: new Date().toLocaleString('pt-BR'),
        });
      }

      case 'verificar_falhas_integracao_erp': {
        if (userRole !== 'ADMIN') return `Acesso negado. Apenas administradores podem verificar falhas de integração.`;

        // Verifica usuários sem CPF (não conseguem usar MIO)
        const { count: semCpf } = await supabaseAdmin
          .from('users_unified')
          .select('*', { count: 'exact', head: true })
          .is('cpf', null);

        // Verifica credenciais do Poliweb sem login_url configurado
        const { count: poliwebSemUrl } = await supabaseAdmin
          .from('poliweb_credentials')
          .select('*', { count: 'exact', head: true })
          .is('login_url', null);

        // Verifica integrações Microsoft expiradas
        const { count: msExpiradas } = await supabaseAdmin
          .from('user_integrations')
          .select('*', { count: 'exact', head: true })
          .eq('provider', 'microsoft_exchange')
          .lt('expires_at', new Date().toISOString());

        return ***REMOVED***
          usuarios_sem_cpf_mio: semCpf,
          poliweb_sem_url: poliwebSemUrl,
          integracoes_microsoft_expiradas: msExpiradas,
          verificado_em: new Date().toLocaleString('pt-BR'),
          recomendacao: semCpf && semCpf > 0
            ? `${semCpf} usuário(s) sem CPF cadastrado — eles não conseguem consultar dados no MIO.`
            : 'Nenhuma falha crítica detectada.',
        });
      }

      case 'buscar_solicitacoes_compra': {
        const { status, limite = 5 } = args;
        let query = supabaseAdmin
          .from('purchase_requests')
          .select('id, rqf_number, provider_name, buyer_name, status, created_at')
          .order('created_at', { ascending: false })
          .limit(limite);

        if (userRole !== 'ADMIN') {
          query = query.eq('created_by', userId);
        }

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) return `Erro ao buscar solicitações de compra: ${error.message}`;
        if (!data || data.length === 0) return `Nenhuma solicitação de compra encontrada.`;
        return JSON.stringify(data);
      }

      case 'buscar_pedidos_compra': {
        const { limite = 5 } = args;
        let query = supabaseAdmin
          .from('purchase_orders')
          .select('id, po_number, supplier_name, buyer_name, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(limite);

        if (userRole !== 'ADMIN') {
          query = query.or(`user_id.eq.${userId},approver_ids.cs.{${userId}}`);
        }

        const { data, error } = await query;
        if (error) return `Erro ao buscar pedidos de compra: ${error.message}`;
        if (!data || data.length === 0) return `Nenhum pedido de compra encontrado.`;
        return JSON.stringify(data);
      }

      case 'buscar_fornecedores': {
        const { termo } = args;
        const { data, error } = await supabaseAdmin
          .from('suppliers')
          .select('id, trade_name, legal_name, document_number, category')
          .or(`trade_name.ilike.%${termo}%,legal_name.ilike.%${termo}%,document_number.ilike.%${termo}%`)
          .limit(10);
        
        if (error) return `Erro ao buscar fornecedores: ${error.message}`;
        if (!data || data.length === 0) return `Nenhum fornecedor encontrado com o termo "${termo}".`;
        return JSON.stringify(data);
      }

      case 'buscar_cursos_disponiveis': {
        const { categoria } = args;
        let query = supabaseAdmin
          .from('academy_courses')
          .select('id, title, description, level, is_active, academy_categories!inner(name)')
          .eq('is_active', true);

        if (categoria) {
          query = query.ilike('academy_categories.name', `%${categoria}%`);
        }

        query = query.order('title');

        const { data, error } = await query;
        if (error) return `Erro ao buscar cursos: ${error.message}`;
        if (!data || data.length === 0) return `Nenhum curso disponível encontrado na Academy.`;
        return JSON.stringify(data);
      }

      case 'buscar_progresso_academy': {
        const { curso_id } = args;
        let query = supabaseAdmin
          .from('academy_enrollments')
          .select('id, enrolled_at, completed_at, course:academy_courses(id, title)')
          .eq('user_id', userId);

        if (curso_id) {
          query = query.eq('course_id', curso_id);
        }

        const { data, error } = await query;
        if (error) return `Erro ao buscar progresso na Academy: ${error.message}`;
        if (!data || data.length === 0) return `Nenhum progresso de curso encontrado para o seu usuário.`;
        return JSON.stringify(data);
      }

      // =====================================================
      // Microsoft Graph - Handlers das novas ferramentas
      // =====================================================

      case 'listar_contatos_outlook': {
        const { email, limite = 20 } = args;
        const contacts = await msGraphClient.listContacts(email, limite);
        if (!contacts.length) return `Nenhum contato encontrado para ${email}.`;
        return JSON.stringify(contacts);
      }

      case 'buscar_grupos_365': {
        const { limite = 50 } = args;
        const groups = await msGraphClient.listGroups(limite);
        if (!groups.length) return 'Nenhum grupo encontrado.';
        return JSON.stringify(groups);
      }

      case 'buscar_membros_grupo': {
        const { grupo_id } = args;
        const members = await msGraphClient.getGroupMembers(grupo_id);
        if (!members.length) return 'Nenhum membro encontrado neste grupo.';
        return JSON.stringify(members);
      }

      case 'buscar_info_organizacao': {
        const org = await msGraphClient.getOrganization();
        const domains = await msGraphClient.listDomains();
        return ***REMOVED*** organizacao: org, dominios: domains });
      }

      case 'buscar_alertas_seguranca': {
        const { limite = 20 } = args;
        const alerts = await msGraphClient.listSecurityAlerts(limite);
        if (!alerts.length) return 'Nenhum alerta de segurança ativo.';
        return JSON.stringify(alerts);
      }

      case 'buscar_incidentes_seguranca': {
        const { limite = 10 } = args;
        const incidents = await msGraphClient.getSecurityIncidents(limite);
        if (!incidents.length) return 'Nenhum incidente de segurança encontrado.';
        return JSON.stringify(incidents);
      }

      case 'buscar_logs_auditoria': {
        const { tipo, limite = 20 } = args;
        if (tipo === 'signin') {
          const signins = await msGraphClient.getSignInLogs(limite);
          if (!signins.length) return 'Nenhum log de sign-in encontrado.';
          return JSON.stringify(signins);
        }
        const audits = await msGraphClient.getAuditLogs(limite);
        if (!audits.length) return 'Nenhum log de auditoria encontrado.';
        return JSON.stringify(audits);
      }

      case 'listar_aplicacoes_azure': {
        const { limite = 50 } = args;
        const apps = await msGraphClient.listApplications(limite);
        if (!apps.length) return 'Nenhuma aplicação encontrada.';
        return JSON.stringify(apps);
      }

      case 'listar_dispositivos': {
        const { limite = 50 } = args;
        const devices = await msGraphClient.listDevices(limite);
        if (!devices.length) return 'Nenhum dispositivo encontrado.';
        return JSON.stringify(devices);
      }

      case 'buscar_sites_sharepoint': {
        const { busca } = args;
        const sites = await msGraphClient.listSites(busca);
        if (!sites.length) return 'Nenhum site do SharePoint encontrado.';
        return JSON.stringify(sites);
      }

      case 'listar_cadernos_onenote': {
        const { email } = args;
        const notebooks = await msGraphClient.listNotebooks(email);
        if (!notebooks.length) return `Nenhum caderno OneNote encontrado para ${email}.`;
        return JSON.stringify(notebooks);
      }

      case 'buscar_tarefas_todo': {
        const { email } = args;
        const lists = await msGraphClient.listTaskLists(email);
        if (!lists.length) return `Nenhuma lista de tarefas encontrada para ${email}.`;
        return JSON.stringify(lists);
      }

      case 'buscar_reunioes_online': {
        const { email } = args;
        const meetings = await msGraphClient.listOnlineMeetings(email);
        if (!meetings.length) return `Nenhuma reunião online encontrada para ${email}.`;
        return JSON.stringify(meetings);
      }

      case 'buscar_canais_teams': {
        const { team_id } = args;
        const channels = await msGraphClient.listTeamChannels(team_id);
        if (!channels.length) return 'Nenhum canal encontrado nesta equipe.';
        return JSON.stringify(channels);
      }

      case 'buscar_status_servicos_365': {
        const health = await msGraphClient.getServiceHealth();
        const issues = await msGraphClient.getServiceIssues();
        return ***REMOVED*** servicos: health, incidentes: issues });
      }

      case 'buscar_reviews_acesso': {
        const reviews = await msGraphClient.listAccessReviews();
        if (!reviews.length) return 'Nenhum access review encontrado.';
        return JSON.stringify(reviews);
      }

      // =====================================================
      // AGENTE PROATIVO — Novas ferramentas
      // =====================================================

      case 'pesquisar_emails_outlook':
        return await executePesquisarEmailsOutlook(args);

      case 'enviar_email_outlook':
        return await executeEnviarEmailOutlook(args);

      case 'criar_nota_corporativa':
        return await executeCriarNotaCorporativa(args);

      case 'agendar_tarefa_agente':
        return await executeAgendarTarefaAgente(args, userId);

      case 'analisar_kpis_negocio':
        return await executeAnalisarKPIs(args);

      case 'enviar_notificacao_proativa':
        return await executeEnviarNotificacaoProativa(args, userId);

      case 'gerenciar_base_conhecimento':
        return await executeGerenciarBaseConhecimento(args, userId);

      default:
        return `Ferramenta desconhecida: ${name}`;
    }
  } catch (err) {
    return `Erro interno ao executar ferramenta: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Busca e-mails globais usando Client Credentials Flow
 */
async function getGlobalUserEmails(email: string): Promise<string> {
  const MS_CLIENT_ID = process.env.MS_GRAPH_CLIENT_ID || '';
  const MS_CLIENT_SECRET = process.env.MS_GRAPH_CLIENT_SECRET || '';
  const MS_TENANT_ID = process.env.MS_GRAPH_TENANT_ID || 'common';

  if (!MS_CLIENT_ID || !MS_CLIENT_SECRET) {
    return 'Erro: Credenciais do Azure AD (Client ID/Secret) não configuradas no servidor.';
  }

  // 1. Obter Token de Aplicativo (Application Token)
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return `Erro ao obter Token de App. A aplicação pode não ter sido configurada para o fluxo Client Credentials. Detalhes: ${JSON.stringify(tokenData)}`;
    }

    // 2. Buscar E-mails do Usuário Específico
    const mailRes = await fetch(`https://graph.microsoft.com/v1.0/users/${email}/messages?$top=5&$select=subject,from,receivedDateTime,bodyPreview`, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    if (!mailRes.ok) {
      const errorData = await mailRes.text();
      if (mailRes.status === 403) {
        return `Erro 403 (Acesso Negado). Você configurou a Application Permission "Mail.Read.All" no Azure AD? Detalhes: ${errorData}`;
      }
      return `Erro ao ler e-mails do usuário via Graph API: ${mailRes.status} - ${errorData}`;
    }

    const mailData = await mailRes.json();
    if (!mailData.value || mailData.value.length === 0) {
      return `A caixa de entrada de ${email} está vazia ou inacessível.`;
    }

    const emails = mailData.value.map((msg: any) => ({
      subject: msg.subject,
      from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Desconhecido',
      date: new Date(msg.receivedDateTime).toLocaleString('pt-BR'),
      preview: msg.bodyPreview
    }));

    return JSON.stringify(emails);
  } catch (err) {
    return `Erro de rede ao conectar com Microsoft Graph: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// =====================================================
// NOVAS FERRAMENTAS DO AGENTE PROATIVO
// =====================================================

async function executePesquisarEmailsOutlook(args: any): Promise<string> {
  try {
    const emails = await msGraphClient.searchEmails(
      args.email_usuario,
      args.consulta,
      {
        from: args.de,
        subject: args.assunto,
        dateFrom: args.data_inicio,
        dateTo: args.data_fim,
        folder: args.pasta,
        top: Math.min(args.limite || 20, 50),
      }
    );

    if (emails.length === 0) return 'Nenhum e-mail encontrado com os filtros informados.';

    return JSON.stringify(emails.map(e => ({
      assunto: e.subject,
      de: (e.from as any)?.emailAddress?.name || (e.from as any)?.emailAddress?.address || 'Desconhecido',
      data: new Date(e.receivedDateTime).toLocaleString('pt-BR'),
      preview: e.bodyPreview?.substring(0, 200),
      lido: e.isRead,
      anexos: e.hasAttachments,
    })));
  } catch (err) {
    return `Erro ao pesquisar e-mails: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeEnviarEmailOutlook(args: any): Promise<string> {
  try {
    const to = args.destinatarios.split(',').map((e: string) => e.trim()).filter(Boolean);
    const cc = args.copia ? args.copia.split(',').map((e: string) => e.trim()).filter(Boolean) : undefined;

    const success = await msGraphClient.sendEmail(
      args.email_remetente,
      to,
      args.assunto,
      args.corpo,
      cc
    );

    return success
      ? `E-mail enviado com sucesso de ${args.email_remetente} para ${to.join(', ')}`
      : 'Erro ao enviar e-mail via Microsoft Graph.';
  } catch (err) {
    return `Erro ao enviar e-mail: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeCriarNotaCorporativa(args: any): Promise<string> {
  try {
    if (args.tipo === 'onenote') {
      // Primeiro, buscar notebooks e seções do usuário
      const notebooks = await msGraphClient.listNotebooks(args.email_usuario);
      if (notebooks.length === 0) return 'Nenhum notebook encontrado para este usuário.';

      const sections = await msGraphClient.listNotebookSections(args.email_usuario, notebooks[0].id);
      if (sections.length === 0) return 'Nenhuma seção encontrada no notebook.';

      const result = await msGraphClient.createOneNotePage(
        args.email_usuario,
        sections[0].id,
        args.titulo,
        args.conteudo || '<p>Sem conteúdo adicional.</p>'
      );

      return result
        ? `Nota "${args.titulo}" criada com sucesso no OneNote.${result.link ? ` Link: ${result.link}` : ''}`
        : 'Erro ao criar nota no OneNote.';

    } else if (args.tipo === 'todo') {
      const lists = await msGraphClient.listTaskLists(args.email_usuario);
      if (lists.length === 0) return 'Nenhuma lista de tarefas encontrada.';

      const result = await msGraphClient.createToDoTask(
        args.email_usuario,
        lists[0].id,
        {
          title: args.titulo,
          body: args.conteudo,
          dueDate: args.data_vencimento,
          importance: args.importancia || 'normal',
        }
      );

      return result
        ? `Tarefa "${args.titulo}" criada com sucesso no Microsoft To Do.`
        : 'Erro ao criar tarefa no To Do.';
    }

    return 'Tipo inválido. Use "onenote" ou "todo".';
  } catch (err) {
    return `Erro ao criar nota/tarefa: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeAgendarTarefaAgente(args: any, userId: string): Promise<string> {
  try {
    const { createScheduledTask } = await import('@/lib/ia/agent-service');

    const targetUsers = args.usuarios_alvo
      ? args.usuarios_alvo.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const targetRoles = args.roles_alvo
      ? args.roles_alvo.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const channels = args.canais
      ? args.canais.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ['push', 'email'];

    const task = await createScheduledTask({
      userId,
      taskName: args.nome,
      taskType: args.tipo,
      prompt: args.prompt,
      schedule: args.cron,
      targetUsers,
      targetRoles,
      channels,
      maxRuns: args.max_execucoes,
    });

    return task
      ? `Tarefa "${args.nome}" agendada com sucesso! Cron: ${args.cron}. Próxima execução: ${task.next_run ? new Date(task.next_run).toLocaleString('pt-BR') : 'calculando...'}`
      : 'Erro ao agendar tarefa.';
  } catch (err) {
    return `Erro ao agendar tarefa: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeAnalisarKPIs(args: any): Promise<string> {
  try {
    const { analyzeKPIs } = await import('@/lib/ia/agent-service');
    const analyses = await analyzeKPIs(args.departamento);

    if (analyses.length === 0) {
      return 'Todos os KPIs estão dentro das metas! Nenhuma anomalia detectada.';
    }

    const report = analyses.map(a => ({
      kpi: a.kpiLabel,
      atual: `${a.currentValue}${a.unit === 'percent' ? '%' : ''}`,
      meta: `${a.targetValue}${a.unit === 'percent' ? '%' : ''}`,
      gap: `${a.gap.toFixed(1)}%`,
      prioridade: a.priority,
      acao: a.suggestedAction,
      departamento: a.department || 'Global',
    }));

    return ***REMOVED***
      resumo: `${analyses.length} KPI(s) abaixo da meta`,
      criticos: analyses.filter(a => a.priority === 'critical').length,
      altos: analyses.filter(a => a.priority === 'high').length,
      detalhes: report,
    });
  } catch (err) {
    return `Erro ao analisar KPIs: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeEnviarNotificacaoProativa(args: any, userId: string): Promise<string> {
  try {
    const { sendProactiveReminder, logAgentAction } = await import('@/lib/ia/agent-service');

    const userIds = args.usuarios.split(',').map((s: string) => s.trim()).filter(Boolean);
    const channels = args.canais
      ? args.canais.split(',').map((s: string) => s.trim()).filter(Boolean)
      : ['push', 'portal'];

    const results: any[] = [];

    for (const targetUserId of userIds) {
      const result = await sendProactiveReminder(
        targetUserId,
        args.titulo,
        args.mensagem,
        channels,
        { priority: args.prioridade || 'medium', actionUrl: args.url_acao }
      );
      results.push({ userId: targetUserId, ...result });
    }

    const totalSent = results.filter(r => r.push || r.portal || r.email).length;
    return `Notificação "${args.titulo}" enviada para ${totalSent}/${userIds.length} usuário(s). Canais: ${channels.join(', ')}.`;
  } catch (err) {
    return `Erro ao enviar notificação: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function executeGerenciarBaseConhecimento(args: any, userId: string): Promise<string> {
  try {
    const kb = await import('@/lib/ia/knowledge-base');

    switch (args.acao) {
      case 'adicionar': {
        if (!args.titulo || !args.conteudo) return 'Título e conteúdo são obrigatórios para adicionar.';
        const entry = await kb.addKnowledge({
          title: args.titulo,
          content: args.conteudo,
          category: args.categoria || 'general',
          scope: args.escopo || 'global',
          scope_id: args.escopo === 'user' ? userId : undefined,
          tags: args.tags ? args.tags.split(',').map((t: string) => t.trim()) : [],
        }, userId);

        return entry
          ? `Informação "${args.titulo}" adicionada à base de conhecimento (escopo: ${args.escopo || 'global'}).`
          : 'Erro ao adicionar informação.';
      }

      case 'buscar': {
        if (!args.busca) return 'Informe um termo de busca.';
        const results = await kb.searchKnowledge(args.busca, {
          userId,
          userRole: 'ADMIN', // A busca via IA usa o contexto do usuário
          limit: 10,
        });

        if (results.length === 0) return 'Nenhuma informação encontrada na base de conhecimento.';

        return JSON.stringify(results.map(r => ({
          id: r.id,
          titulo: r.title,
          conteudo: r.content.substring(0, 300),
          categoria: r.category,
          escopo: r.scope,
          tags: r.tags,
        })));
      }

      case 'listar': {
        const { entries, total } = await kb.listAllKnowledge({
          category: args.categoria,
          scope: args.escopo,
          isActive: true,
          limit: 20,
        });

        return ***REMOVED***
          total,
          entradas: entries.map(e => ({
            id: e.id,
            titulo: e.title,
            categoria: e.category,
            escopo: e.scope,
            ativo: e.is_active,
          })),
        });
      }

      case 'atualizar': {
        if (!args.id) return 'ID da entrada é obrigatório para atualizar.';
        const updates: any = {};
        if (args.titulo) updates.title = args.titulo;
        if (args.conteudo) updates.content = args.conteudo;
        if (args.categoria) updates.category = args.categoria;
        if (args.tags) updates.tags = args.tags.split(',').map((t: string) => t.trim());

        const success = await kb.updateKnowledge(args.id, updates, userId);
        return success ? 'Informação atualizada com sucesso.' : 'Erro ao atualizar.';
      }

      case 'remover': {
        if (!args.id) return 'ID da entrada é obrigatório para remover.';
        const success = await kb.deactivateKnowledge(args.id);
        return success ? 'Informação removida da base de conhecimento.' : 'Erro ao remover.';
      }

      default:
        return 'Ação inválida. Use: adicionar, buscar, listar, atualizar ou remover.';
    }
  } catch (err) {
    return `Erro ao gerenciar base de conhecimento: ${err instanceof Error ? err.message : String(err)}`;
  }
}
