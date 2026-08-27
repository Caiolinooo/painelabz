import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { autoGenerateESocialEvents } from '@/services/eSocialAutoService';
import { isValidCpf, normalizeCpf } from '@/lib/utils/identity';
import { loadColaboradorDetail, parseIncludeParam } from '@/lib/gestao-tripulantes/colaborador-get';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await context.params;
    const include = parseIncludeParam(request.nextUrl.searchParams.get('include'));
    const result = await loadColaboradorDetail(id, include);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    if (result.notFound) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    console.log(
      `[GT GET /colaboradores/${id}] ${result.timingsMs.total}ms wave1=${result.timingsMs.wave1} wave2=${result.timingsMs.wave2} include=${[...include].join(',')}`
    );

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Erro ao obter colaborador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Persist every editable gt_colaboradores column. Skip PK/system/view/e-Social tracking.
    const ALLOWED_COLAB_FIELDS = new Set([
      'nome_completo', 'cpf', 'rg', 'orgao_emissor', 'data_emissao_rg',
      'data_nascimento', 'sexo', 'genero', 'estado_civil', 'peso', 'altura',
      'raca_cor', 'escolaridade', 'deficiencia', 'deficiencia_cid',
      'nacionalidade', 'naturalidade', 'naturalidade_uf', 'pais_nascimento',
      'nome_mae', 'nome_pai', 'email', 'telefone', 'foto_url',
      'endereco_logradouro', 'endereco_numero', 'endereco_complemento',
      'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_cep',
      'dados_bancarios', 'pis_pasep', 'ctps', 'ctps_serie', 'ctps_uf',
      'cnh', 'cnh_categoria', 'cnh_validade', 'cnh_uf',
      'titulo_eleitor', 'titulo_eleitor_zona', 'titulo_eleitor_sessao',
      'certidao_tipo', 'certidao_numero', 'certidao_cartorio',
      'matricula', 'matricula_esocial', 'departamento',
      'cargo_id', 'centro_custo_id', 'empresa_id', 'embarcacao_atual_id',
      'data_admissao', 'data_demissao', 'motivo_demissao',
      'salario', 'tipo_salario', 'forma_pagamento', 'sindicato', 'cbo',
      'jornada_semanal', 'jornada_mensal', 'tipo_contrato', 'prazo_contrato',
      'categoria_contrato', 'tipo_trabalho', 'tipo_mao_de_obra', 'regime_trabalho',
      'escala_embarque', 'escala_folga', 'status_embarque', 'standby', 'ativo',
      'data_ultimo_embarque', 'data_ultimo_desembarque', 'data_proximo_embarque',
      'dados_saude', 'tipo_admissao', 'natureza_atividade', 'tipo_jornada', 'tipo_lotacao',
    ]);

    const BOOLEAN_FIELDS = new Set(['standby', 'ativo']);
    const NUMBER_FIELDS = new Set(['peso', 'altura', 'salario']);

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    if ('cpf' in body) {
      const rawCpf = body.cpf == null ? '' : String(body.cpf);
      if (!rawCpf.trim()) {
        return NextResponse.json({ error: 'CPF é obrigatório' }, { status: 400 });
      }
      if (!isValidCpf(rawCpf)) {
        return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      }
      updateData.cpf = normalizeCpf(rawCpf);
    }

    if ('nome_completo' in body) {
      const nome = body.nome_completo == null ? '' : String(body.nome_completo).trim();
      if (!nome) {
        return NextResponse.json({ error: 'Nome completo é obrigatório' }, { status: 400 });
      }
      updateData.nome_completo = nome;
    }

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_COLAB_FIELDS.has(key) || key === 'cpf' || key === 'nome_completo') continue;

      if (BOOLEAN_FIELDS.has(key)) {
        if (typeof value === 'boolean') updateData[key] = value;
        else if (value === 'true' || value === 'false') updateData[key] = value === 'true';
        else if (value == null || value === '') updateData[key] = false;
        else updateData[key] = Boolean(value);
        continue;
      }

      if (NUMBER_FIELDS.has(key)) {
        if (value == null || value === '') { updateData[key] = null; continue; }
        const n = Number(value);
        if (Number.isNaN(n)) {
          return NextResponse.json({ error: `Campo ${key} deve ser numérico` }, { status: 400 });
        }
        updateData[key] = n;
        continue;
      }

      if (typeof value === 'string' && value.trim() === '') {
        updateData[key] = null;
      } else {
        updateData[key] = value;
      }
    }

    // View aliases (cargo_nome etc.) are not table columns — resolve to FKs instead of dropping.
    const fkNameResolvers: { nameKey: string; idKey: string; table: string }[] = [
      { nameKey: 'cargo_nome', idKey: 'cargo_id', table: 'gt_cargos' },
      { nameKey: 'empresa_nome', idKey: 'empresa_id', table: 'gt_empresas' },
      { nameKey: 'embarcacao_nome', idKey: 'embarcacao_atual_id', table: 'gt_embarcacoes' },
      { nameKey: 'centro_custo_nome', idKey: 'centro_custo_id', table: 'gt_centros_custo' },
    ];
    for (const { nameKey, idKey, table } of fkNameResolvers) {
      if (idKey in updateData) continue;
      if (typeof body[nameKey] !== 'string' || !body[nameKey].trim()) continue;
      const { data: row } = await supabaseAdmin
        .from(table)
        .select('id')
        .ilike('nome', body[nameKey].trim())
        .limit(1)
        .maybeSingle();
      if (!row) {
        return NextResponse.json({ error: `${nameKey.replace('_nome', '')} não encontrado: ${body[nameKey]}` }, { status: 400 });
      }
      updateData[idKey] = row.id;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('gt_colaboradores')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar colaborador:', updateError);
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'CPF já cadastrado para outro colaborador' }, { status: 409 });
      }
      return NextResponse.json({ error: updateError.message || 'Erro ao atualizar colaborador' }, { status: 500 });
    }

    if (updated && updated.id) {
      autoGenerateESocialEvents(updated.id).catch(err => {
        console.error('[eSocialAuto] Failed in background execution on update:', err);
      });
    }

    const result = await loadColaboradorDetail(id, parseIncludeParam('all'));

    return NextResponse.json({
      success: true,
      data: result.data || updated
    });
  } catch (error) {
    console.error('Erro ao atualizar colaborador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await context.params;

    const { error: softDeleteError } = await supabaseAdmin
      .from('gt_colaboradores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (softDeleteError) {
      console.error('Erro ao excluir colaborador:', softDeleteError);
      return NextResponse.json({ error: 'Erro ao excluir colaborador' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Colaborador excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir colaborador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
