import { supabaseAdmin } from '@/lib/supabase';

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
  }
];

/**
 * Executa a ferramenta solicitada pelo modelo
 */
export async function executeToolCall(name: string, args: any, userRole: string, userId: string): Promise<string> {
  console.log(`[IA Tools] Executando ferramenta: ${name} com args:`, args);

  try {
    switch (name) {
      case 'buscar_funcionario': {
        const { busca } = args;
        
        let query = supabaseAdmin
          .from('users_unified')
          .select('id, first_name, last_name, email, role, department, position')
          .or(`first_name.ilike.%${busca}%,last_name.ilike.%${busca}%,email.ilike.%${busca}%`)
          .limit(5);
        
        const { data, error } = await query;
        if (error) return `Erro ao buscar funcionário: ${error.message}`;
        if (!data || data.length === 0) return `Nenhum funcionário encontrado com o termo "${busca}".`;
        
        return JSON.stringify(data);
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
        const { funcionario_id } = args;
        const { data, error } = await supabaseAdmin
          .from('reimbursement_requests')
          .select('status, total_amount, description, created_at')
          .eq('user_id', funcionario_id)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) return `Erro ao buscar reembolsos: ${error.message}`;
        if (!data || data.length === 0) return `Nenhuma solicitação de reembolso encontrada para este funcionário.`;
        return JSON.stringify(data);
      }

      case 'ler_email_funcionario': {
        if (userRole !== 'ADMIN') {
          return `Acesso negado. Apenas administradores podem ler e-mails de outros funcionários.`;
        }
        
        const { email_corporativo } = args;
        return await getGlobalUserEmails(email_corporativo);
      }

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
