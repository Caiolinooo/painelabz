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
    systemPromptAddon: 'Você é o Sub-Agente de RH & Gestão de Tripulantes. Responda com foco em colaboradores, férias, reembolsos, EPIs e embarques.',
    toolNames: [
      'buscar_funcionario',
      'buscar_dados_usuario',
      'buscar_usuarios_global',
      'gerenciar_embarques',
      'gerenciar_treinamentos',
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
    ],
  },
  analytics_admin: {
    id: 'analytics_admin',
    name: 'Agente de Analytics & Dashboards',
    description: 'Especialista em métricas, relatórios em Excel, dashboards visuais e automação.',
    icon: '📊',
    systemPromptAddon: 'Você é o Sub-Agente de Analytics & Gestão Executiva. Apresente relatórios detalhados e dashboards interativos.',
    toolNames: [
      'analisar_kpis',
      'render_dashboard',
      'gerar_relatorio_excel',
      'gerenciar_notificacoes',
      'gerenciar_base_conhecimento',
    ],
  },
  geral: {
    id: 'geral',
    name: 'Assistente Geral',
    description: 'Atendimento geral, navegação no portal e tira-dúvidas.',
    icon: '💬',
    systemPromptAddon: 'Você é o Assistente Geral da ABZ. Seja cordial, objetivo e ajude o usuário com navegação e orientações.',
    toolNames: [
      'buscar_dados_usuario',
      'gerenciar_base_conhecimento',
    ],
  },
};

/**
 * Identifica o melhor Sub-Agente com base no texto da mensagem do usuário
 */
export function routeToSubAgent(userMessage: string): SubAgentDefinition {
  const msg = (userMessage || '').toLowerCase();

  if (msg.includes('esocial') || msg.includes('e-social') || msg.includes('cat') || msg.includes('afastamento') || msg.includes('s-22') || msg.includes('s-1.3')) {
    return SUB_AGENTS.esocial_compliance;
  }

  if (msg.includes('aso') || msg.includes('exame') || msg.includes('médico') || msg.includes('atestado') || msg.includes('quarentena')) {
    return SUB_AGENTS.aso_saude;
  }

  if (msg.includes('dashboard') || msg.includes('kpi') || msg.includes('excel') || msg.includes('relatório') || msg.includes('relatorio') || msg.includes('métrica')) {
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
