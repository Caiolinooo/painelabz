/**
 * Architecture: Sub-Agentes Especializados do Sistema de IA ABZ
 * Divide as ferramentas e responsabilidades em agentes focados por domínio
 * garantindo compatibilidade estrita com Google Gemini, OpenAI e LLMs locais.
 */

export interface SubAgentDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPromptAddon: string;
  toolNames: string[];
}

export const SUB_AGENTS: Record<string, SubAgentDefinition> = {
  rh_tripulantes: {
    id: 'rh_tripulantes',
    name: 'Agente de RH & Tripulantes',
    description: 'Especialista em perfil de colaboradores, férias, reembolsos, EPIs e embarques.',
    icon: '👥',
    systemPromptAddon:
      'Você é o Sub-Agente de RH & Gestão de Tripulantes. Responda com foco em colaboradores, férias, reembolsos, EPIs e embarques. Para "minhas pendências", use buscar_dados_usuario (tipo resumo) e depois render_dashboard.',
    toolNames: [
      'buscar_funcionario',
      'buscar_dados_usuario',
      'buscar_usuarios_global',
      'gerenciar_embarques',
      'gerenciar_treinamentos',
      'navegar_portal',
      'buscar_ferias',
      'buscar_reembolsos',
      'buscar_epis',
      'render_dashboard',
    ],
  },
  aso_saude: {
    id: 'aso_saude',
    name: 'Agente de Saúde & ASO',
    description: 'Especialista em Atestados de Saúde Ocupacional (ASO) e validação médica.',
    icon: '🩺',
    systemPromptAddon: 'Você é o Sub-Agente de Saúde Ocupacional & ASOs. Foque na validação de exames, validades e quarentena de documentos.',
    toolNames: [
      'buscar_asos',
      'consultar_quarentena_aso',
      'validar_aso_identidade',
      'buscar_dados_usuario',
      'navegar_portal',
      'render_dashboard',
    ],
  },
  esocial_compliance: {
    id: 'esocial_compliance',
    name: 'Agente de e-Social & Compliance',
    description: 'Especialista em eventos trabalhistas e-Social, CAT (S-2210), Afastamentos (S-2230) e Riscos (S-2240).',
    icon: '🏛️',
    systemPromptAddon: 'Você é o Sub-Agente de Compliance & e-Social. Foque na conferência de eventos S-1.3, recibos e obrigações fiscais.',
    toolNames: [
      'consultar_eventos_esocial',
      'gerar_xml_esocial',
      'consultar_afastamentos',
      'consultar_acidentes_cat',
      'navegar_portal',
    ],
  },
  analytics_admin: {
    id: 'analytics_admin',
    name: 'Agente de Analytics & Dashboards',
    description: 'Especialista em métricas, relatórios em Excel, dashboards visuais e automação.',
    icon: '📊',
    systemPromptAddon: 'Você é o Sub-Agente de Analytics & Gestão Executiva. Apresente relatórios detalhados e dashboards interativos. Use render_dashboard para pendências/KPIs.',
    toolNames: [
      'analisar_kpis_negocio',
      'buscar_kpis_sistema',
      'buscar_sinais_kpi_comunicacao',
      'buscar_dados_usuario',
      'render_dashboard',
      'gerar_planilha_excel',
      'gerar_relatorio_pdf',
      'gerenciar_notificacoes',
      'gerenciar_base_conhecimento',
      'navegar_portal',
    ],
  },
  geral: {
    id: 'geral',
    name: 'Assistente Geral',
    description: 'Atendimento geral, navegação no portal e tira-dúvidas.',
    icon: '💬',
    systemPromptAddon:
      'Você é o Assistente Geral da ABZ. Seja cordial e objetivo. Para abrir módulos use a tool navegar_portal (tolera erros de digitação). Para pendências use buscar_dados_usuario + render_dashboard.',
    toolNames: [
      'buscar_dados_usuario',
      'buscar_funcionario',
      'buscar_ferias',
      'buscar_reembolsos',
      'gerenciar_base_conhecimento',
      'salvar_memoria_usuario',
      'listar_memorias_usuario',
      'navegar_portal',
      'meu_calendario',
      'meus_emails',
      'minhas_conversas_teams',
      'render_dashboard',
    ],
  },
  companion: {
    id: 'companion',
    name: 'ABZ Companion',
    description: 'Assistente flutuante: navegação + consultas rápidas com tools.',
    icon: '🧭',
    systemPromptAddon:
      'Você é o ABZ Companion. Priorize navegar_portal quando o usuário quiser abrir telas. Use tools para dados reais. Respostas curtas. Salve fatos duráveis com salvar_memoria_usuario. Para pendências: buscar_dados_usuario (resumo) + render_dashboard se útil.',
    toolNames: [
      'navegar_portal',
      'buscar_dados_usuario',
      'buscar_funcionario',
      'buscar_ferias',
      'buscar_reembolsos',
      'buscar_kpis_sistema',
      'analisar_kpis_negocio',
      'buscar_sinais_kpi_comunicacao',
      'meus_emails',
      'meu_calendario',
      'criar_evento_calendario',
      'minhas_conversas_teams',
      'pesquisar_mensagens_teams',
      'buscar_epis',
      'buscar_cursos_disponiveis',
      'buscar_progresso_academy',
      'buscar_tripulantes',
      'buscar_escalas',
      'gerenciar_base_conhecimento',
      'salvar_memoria_usuario',
      'listar_memorias_usuario',
      'render_dashboard',
    ],
  },
};

/**
 * Identifica o melhor Sub-Agente com base no texto da mensagem do usuário
 */
export function routeToSubAgent(userMessage: string): SubAgentDefinition {
  const msg = (userMessage || '').toLowerCase();

  if (msg.includes('[abz_companion]') || msg.includes('abz_companion')) {
    return SUB_AGENTS.companion;
  }

  // Intenção clara de navegação → companion/geral com navegar_portal
  if (
    /\b(abrir|abre|abra|ir para|vai para|vai pra|me leva|me leve|navegar|acessar|acesse|goto)\b/i.test(msg) ||
    msg.includes('abrir ') ||
    msg.includes('ir pra')
  ) {
    return SUB_AGENTS.companion;
  }

  if (msg.includes('esocial') || msg.includes('e-social') || msg.includes('cat') || msg.includes('afastamento') || msg.includes('s-22') || msg.includes('s-1.3')) {
    return SUB_AGENTS.esocial_compliance;
  }

  if (msg.includes('aso') || msg.includes('exame') || msg.includes('médico') || msg.includes('medico') || msg.includes('atestado') || msg.includes('quarentena')) {
    return SUB_AGENTS.aso_saude;
  }

  if (msg.includes('dashboard') || msg.includes('kpi') || msg.includes('excel') || msg.includes('relatório') || msg.includes('relatorio') || msg.includes('métrica') || msg.includes('metrica')) {
    return SUB_AGENTS.analytics_admin;
  }

  if (
    msg.includes('férias') || msg.includes('ferias') ||
    msg.includes('reembolso') || msg.includes('embarque') ||
    msg.includes('epi') || msg.includes('funcionário') ||
    msg.includes('funcionario') || msg.includes('colaborador') ||
    msg.includes('pendência') || msg.includes('pendencia') ||
    msg.includes('equipe')
  ) {
    // Pendências do usuário → RH (agora com render_dashboard). KPIs/sistema → analytics.
    if (msg.includes('kpi') || msg.includes('sistema') || msg.includes('dashboard')) {
      return SUB_AGENTS.analytics_admin;
    }
    return SUB_AGENTS.rh_tripulantes;
  }

  return SUB_AGENTS.geral;
}

/**
 * Sanitiza e limpa as ferramentas para envio estrito ao Google Gemini / OpenAI
 */
export function sanitizeToolsForLLM(rawTools: any[]): any[] {
  if (!Array.isArray(rawTools)) return [];

  return rawTools
    .map((t) => {
      if (!t || !t.function || typeof t.function.name !== 'string') return null;

      const fn = t.function;
      const rawParams = fn.parameters || {};
      const rawProps = rawParams.properties || {};

      const cleanProps: Record<string, any> = {};
      for (const [pKey, pVal] of Object.entries(rawProps as Record<string, any>)) {
        if (!pVal || typeof pVal !== 'object') continue;
        cleanProps[pKey] = {
          type: pVal.type || 'string',
          description: pVal.description || pKey,
          ...(Array.isArray(pVal.enum) && pVal.enum.length > 0 ? { enum: pVal.enum } : {}),
        };
      }

      return {
        type: 'function',
        function: {
          name: fn.name,
          description: fn.description || fn.name,
          parameters: {
            type: 'object',
            properties: cleanProps,
            ...(Array.isArray(rawParams.required) && rawParams.required.length > 0 ? { required: rawParams.required } : {}),
          },
        },
      };
    })
    .filter(Boolean);
}
