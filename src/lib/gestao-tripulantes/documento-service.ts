import { supabaseAdmin } from '@/lib/supabase';
import type { GTDocumento, TipoDocumento } from '@/types/gestao-tripulantes';
import {
  garantirNumeroRastreioUnico,
  buscarDuplicado,
  validarDatasObrigatorias,
  calcularStatusValidacaoPorValidade,
} from '@/lib/gestao-tripulantes/documento-integrity';

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

    // Validação dura: emissão + validade (quarentena é exceção)
    const emQuarentena = data.origem === 'ocr' && !data.data_validade;
    const validacao = validarDatasObrigatorias(
      { data_emissao: data.data_emissao, data_validade: data.data_validade },
      { permitirQuarentena: emQuarentena }
    );
    if (!validacao.ok) {
      return { success: false, error: `Documento incompleto: ${validacao.errors.join('; ')}` };
    }

    // Anti-duplicação: atualiza o existente em vez de criar novo
    const duplicado = await buscarDuplicado({
      colaborador_id: colaboradorId,
      tipo_documento: data.tipo_documento,
      titulo: data.titulo,
      numero_documento: data.numero_documento,
    });
    if (duplicado) {
      const merged = await updateDocumento(duplicado.id, {
        titulo: data.titulo,
        numero_documento: data.numero_documento ?? duplicado.numero_documento ?? undefined,
        orgao_emissor: data.orgao_emissor ?? duplicado.orgao_emissor ?? undefined,
        data_emissao: data.data_emissao ?? duplicado.data_emissao ?? undefined,
        data_validade: data.data_validade ?? duplicado.data_validade ?? undefined,
        descricao: data.descricao ?? duplicado.descricao ?? undefined,
      } as Partial<GTDocumento>);
      if (!merged.success) return { success: false, error: merged.error };
      return { success: true, data: merged.data };
    }

    let cpfColaborador: string | null = null;
    {
      const { data: col } = await supabaseAdmin
        .from('gt_colaboradores')
        .select('cpf')
        .eq('id', colaboradorId)
        .maybeSingle();
      cpfColaborador = col?.cpf || null;
    }
    const numero_rastreio = await garantirNumeroRastreioUnico(data.tipo_documento, cpfColaborador);

    const { data: documento, error } = await supabaseAdmin
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
        numero_rastreio,
        origem: data.origem || 'manual',
        ocr_status: 'pendente',
        status_validacao: calcularStatusValidacaoPorValidade(data.data_validade),
        notificado_vencimento: false,
        status_revisao: 'nao_necessita',
        identity_match: 'match',
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

    // Validação dura: estado final precisa de emissão + validade (quarentena é exceção)
    const { data: atual } = await supabaseAdmin
      .from('gt_documentos')
      .select('data_emissao, data_validade, numero_rastreio, tipo_documento, identity_match')
      .eq('id', id)
      .maybeSingle();

    if (!atual) {
      return { success: false, error: 'Documento não encontrado' };
    }

    const emQuarentena = atual.identity_match === 'quarantine';
    const efetivo = {
      data_emissao: 'data_emissao' in data ? (data.data_emissao ?? null) : atual.data_emissao,
      data_validade: 'data_validade' in data ? (data.data_validade ?? null) : atual.data_validade,
    };
    const validacao = validarDatasObrigatorias(efetivo, { permitirQuarentena: emQuarentena });
    if (!validacao.ok) {
      return { success: false, error: `Documento incompleto: ${validacao.errors.join('; ')}` };
    }

    const updateData: Record<string, any> = { ...data, updated_at: new Date().toISOString() };
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.deleted_at;
    delete updateData.colaborador_id;
    delete updateData.numero_rastreio;
    delete updateData.arquivo_hash;
    delete updateData.status_validacao;
    if ('data_validade' in updateData || !atual.data_validade) {
      updateData.status_validacao = calcularStatusValidacaoPorValidade(efetivo.data_validade);
    }
    if (!atual.numero_rastreio) {
      updateData.numero_rastreio = await garantirNumeroRastreioUnico(atual.tipo_documento);
    }

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
