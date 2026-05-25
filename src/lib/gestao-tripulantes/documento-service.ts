import { supabaseAdmin } from '@/lib/supabase';
import type { GTDocumento, TipoDocumento } from '@/types/gestao-tripulantes';

export interface CreateDocumentoData {
  tipo_documento: TipoDocumento;
  subtipo?: string;
  titulo: string;
  descricao?: string;
  numero_documento?: string;
  orgao_emissor?: string;
  data_emissao?: string;
  data_validade?: string;
  arquivo_url?: string;
  arquivo_path?: string;
  arquivo_tamanho_bytes?: number;
  arquivo_tipo?: string;
  origem?: string;
}

export async function listDocumentos(
  colaboradorId: string
): Promise<{ success: boolean; data?: GTDocumento[]; error?: string }> {
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('gt_documentos')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar documentos:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro inesperado em listDocumentos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function createDocumento(
  colaboradorId: string,
  data: CreateDocumentoData
): Promise<{ success: boolean; data?: GTDocumento; error?: string }> {
  try {
    const supabase = supabaseAdmin;

    if (!data.tipo_documento || !data.titulo) {
      return { success: false, error: 'Tipo e título do documento são obrigatórios' };
    }

    const { data: documento, error } = await supabase
      .from('gt_documentos')
      .insert({
        colaborador_id: colaboradorId,
        tipo_documento: data.tipo_documento,
        subtipo: data.subtipo || null,
        titulo: data.titulo,
        descricao: data.descricao || null,
        numero_documento: data.numero_documento || null,
        orgao_emissor: data.orgao_emissor || null,
        data_emissao: data.data_emissao || null,
        data_validade: data.data_validade || null,
        arquivo_url: data.arquivo_url || null,
        arquivo_path: data.arquivo_path || null,
        arquivo_tamanho_bytes: data.arquivo_tamanho_bytes || null,
        arquivo_tipo: data.arquivo_tipo || null,
        origem: data.origem || 'manual',
        ocr_status: 'pendente',
        status_validacao: calcularStatusValidacao(data.data_validade),
        notificado_vencimento: false,
        status_revisao: 'nao_necessita',
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar documento:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: documento };
  } catch (error) {
    console.error('Erro inesperado em createDocumento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function getDocumento(
  id: string
): Promise<{ success: boolean; data?: GTDocumento; error?: string }> {
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('gt_documentos')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar documento:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Documento não encontrado' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erro inesperado em getDocumento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function updateDocumento(
  id: string,
  data: Partial<GTDocumento>
): Promise<{ success: boolean; data?: GTDocumento; error?: string }> {
  try {
    const supabase = supabaseAdmin;

    const updateData: Record<string, any> = { ...data, updated_at: new Date().toISOString() };
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.deleted_at;
    delete updateData.colaborador_id;

    const { data: updated, error } = await supabase
      .from('gt_documentos')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar documento:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('Erro inesperado em updateDocumento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function deleteDocumento(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseAdmin;

    const { error } = await supabase
      .from('gt_documentos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir documento:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro inesperado em deleteDocumento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

function calcularStatusValidacao(dataValidade?: string): GTDocumento['status_validacao'] {
  if (!dataValidade) return 'pendente';

  const hoje = new Date();
  const validade = new Date(dataValidade);
  const diffMs = validade.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'vencido';
  if (diffDays <= 30) return 'vencendo';
  return 'valido';
}
