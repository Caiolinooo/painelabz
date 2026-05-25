import { supabaseAdmin } from '@/lib/supabase';
import type { GTDocumento, GTColaborador, GTNotificacaoLog } from '@/types/gestao-tripulantes';

type CanalNotificacao = 'inapp' | 'email' | 'push';

interface EnviarNotificacaoParams {
  tipo: string;
  colaboradorId?: string;
  documentoId?: string;
  titulo: string;
  mensagem: string;
  destinatarioId?: string;
  canais?: CanalNotificacao[];
}

async function registrarNotificacao(
  params: EnviarNotificacaoParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseAdmin;
    const canais = params.canais || ['inapp'];

    const erros: string[] = [];

    for (const canal of canais) {
      const { error } = await supabase.from('gt_notificacoes_log').insert({
        documento_id: params.documentoId || null,
        colaborador_id: params.colaboradorId || null,
        tipo_notificacao: params.tipo,
        canal,
        titulo: params.titulo,
        mensagem: params.mensagem,
        destinatario_id: params.destinatarioId || null,
        data_envio: new Date().toISOString(),
        sucesso: true,
      });

      if (error) {
        erros.push(error.message);
      }
    }

    if (erros.length > 0) {
      return { success: false, error: erros.join('; ') };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar notificação:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function enviarNotificacaoVencimento(
  documento: GTDocumento
): Promise<{ success: boolean; error?: string }> {
  const diasRestantes = documento.data_validade
    ? Math.ceil(
        (new Date(documento.data_validade).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const titulo = 'Documento próximo do vencimento';
  const mensagem =
    diasRestantes <= 0
      ? `O documento "${documento.titulo}" venceu em ${new Date(documento.data_validade!).toLocaleDateString('pt-BR')}.`
      : `O documento "${documento.titulo}" vence em ${diasRestantes} dias (${new Date(documento.data_validade!).toLocaleDateString('pt-BR')}).`;

  return registrarNotificacao({
    tipo: 'vencimento',
    colaboradorId: documento.colaborador_id,
    documentoId: documento.id,
    titulo,
    mensagem,
    destinatarioId: documento.user_id,
    canais: ['inapp', 'email'],
  });
}

export async function enviarNotificacaoEmbarque(
  colaborador: GTColaborador,
  tipo: 'embarque' | 'desembarque' | 'proximo_embarque'
): Promise<{ success: boolean; error?: string }> {
  const mapTitulo: Record<string, string> = {
    embarque: 'Embarque realizado',
    desembarque: 'Desembarque realizado',
    proximo_embarque: 'Próximo embarque agendado',
  };

  const mapMensagem: Record<string, string> = {
    embarque: `O colaborador ${colaborador.nome_completo} embarcou na ${colaborador.embarcacao_nome || 'embarcação'}.`,
    desembarque: `O colaborador ${colaborador.nome_completo} desembarcou.`,
    proximo_embarque: `O próximo embarque de ${colaborador.nome_completo} está agendado para ${colaborador.data_proximo_embarque ? new Date(colaborador.data_proximo_embarque).toLocaleDateString('pt-BR') : 'em breve'}.`,
  };

  return registrarNotificacao({
    tipo: `embarque_${tipo}`,
    colaboradorId: colaborador.id,
    titulo: mapTitulo[tipo],
    mensagem: mapMensagem[tipo],
  });
}

export async function enviarNotificacaoSubstituicao(
  substituto: { id: string; nome_completo: string },
  substituido: { id: string; nome_completo: string }
): Promise<{ success: boolean; error?: string }> {
  const titulo = 'Substituição registrada';

  const { error: errSubstituto } = await registrarNotificacao({
    tipo: 'substituicao',
    colaboradorId: substituto.id,
    titulo,
    mensagem: `Você foi designado para substituir ${substituido.nome_completo}.`,
    destinatarioId: substituto.id,
    canais: ['inapp', 'push'],
  });

  const { error: errSubstituido } = await registrarNotificacao({
    tipo: 'substituicao',
    colaboradorId: substituido.id,
    titulo,
    mensagem: `${substituto.nome_completo} foi designado para sua substituição.`,
    destinatarioId: substituido.id,
    canais: ['inapp'],
  });

  const erros = [errSubstituto, errSubstituido].filter(Boolean);
  if (erros.length > 0) {
    return { success: false, error: erros.join('; ') };
  }

  return { success: true };
}
