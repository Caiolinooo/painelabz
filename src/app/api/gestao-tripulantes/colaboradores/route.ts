import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { autoGenerateESocialEvents } from '@/services/eSocialAutoService';
import { mioClient } from '@/lib/mio/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const empresa = searchParams.get('empresa');
    const embarcacao = searchParams.get('embarcacao');
    const cargo = searchParams.get('cargo');
    const centroCusto = searchParams.get('centro_custo');
    const status = searchParams.get('status');
    const standby = searchParams.get('standby');
    const onlyVencidos = searchParams.get('onlyVencidos');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('gt_vw_colaboradores_completo')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`nome_completo.ilike.%${search}%,matricula.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (empresa) query = query.eq('empresa_nome', empresa);
    if (embarcacao) query = query.eq('embarcacao_nome', embarcacao);
    if (cargo) query = query.eq('cargo_nome', cargo);
    if (centroCusto) query = query.eq('centro_custo_nome', centroCusto);
    if (status) query = query.eq('status_embarque', status);
    if (standby === 'true') query = query.eq('standby', true);
    if (standby === 'false') query = query.eq('standby', false);
    if (onlyVencidos === 'true') {
      query = query.gt('qtd_docs_vencidos', 0);
    }

    const { data: colaboradores, error, count } = await query
      .order('nome_completo', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao listar colaboradores:', error);
      return NextResponse.json({ error: 'Erro ao listar colaboradores' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: colaboradores || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro na API colaboradores:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { nome_completo, cpf } = body;

    if (!nome_completo || !cpf) {
      return NextResponse.json({ error: 'Nome completo e CPF são obrigatórios' }, { status: 400 });
    }

    const { data: newColaborador, error: createError } = await supabaseAdmin
      .from('gt_colaboradores')
      .insert({
        nome_completo, cpf,
        rg: body.rg || null,
        orgao_emissor: body.orgao_emissor || null,
        data_emissao_rg: body.data_emissao_rg || null,
        data_nascimento: body.data_nascimento || null,
        sexo: body.sexo || null,
        genero: body.genero || null,
        estado_civil: body.estado_civil || null,
        peso: body.peso || null,
        altura: body.altura || null,
        raca_cor: body.raca_cor || null,
        escolaridade: body.escolaridade || null,
        deficiencia: body.deficiencia || null,
        deficiencia_cid: body.deficiencia_cid || null,
        nacionalidade: body.nacionalidade || 'BRASILEIRA',
        naturalidade: body.naturalidade || null,
        naturalidade_uf: body.naturalidade_uf || null,
        pais_nascimento: body.pais_nascimento || 'Brasil',
        nome_mae: body.nome_mae || null,
        nome_pai: body.nome_pai || null,
        email: body.email || null,
        telefone: body.telefone || null,
        endereco_logradouro: body.endereco_logradouro || null,
        endereco_numero: body.endereco_numero || null,
        endereco_complemento: body.endereco_complemento || null,
        endereco_bairro: body.endereco_bairro || null,
        endereco_cidade: body.endereco_cidade || null,
        endereco_uf: body.endereco_uf || null,
        endereco_cep: body.endereco_cep || null,
        dados_bancarios: body.dados_bancarios || null,
        pis_pasep: body.pis_pasep || null,
        ctps: body.ctps || null,
        ctps_serie: body.ctps_serie || null,
        ctps_uf: body.ctps_uf || null,
        cnh: body.cnh || null,
        cnh_categoria: body.cnh_categoria || null,
        cnh_validade: body.cnh_validade || null,
        cnh_uf: body.cnh_uf || null,
        titulo_eleitor: body.titulo_eleitor || null,
        titulo_eleitor_zona: body.titulo_eleitor_zona || null,
        titulo_eleitor_sessao: body.titulo_eleitor_sessao || null,
        certidao_tipo: body.certidao_tipo || null,
        certidao_numero: body.certidao_numero || null,
        certidao_cartorio: body.certidao_cartorio || null,
        matricula: body.matricula || null,
        departamento: body.departamento || null,
        cargo_id: body.cargo_id || null,
        centro_custo_id: body.centro_custo_id || null,
        empresa_id: body.empresa_id || null,
        embarcacao_atual_id: body.embarcacao_atual_id || null,
        data_admissao: body.data_admissao || null,
        data_demissao: body.data_demissao || null,
        motivo_demissao: body.motivo_demissao || null,
        salario: body.salario || null,
        tipo_salario: body.tipo_salario || null,
        forma_pagamento: body.forma_pagamento || null,
        sindicato: body.sindicato || null,
        cbo: body.cbo || null,
        jornada_semanal: body.jornada_semanal || null,
        jornada_mensal: body.jornada_mensal || null,
        tipo_contrato: body.tipo_contrato || null,
        prazo_contrato: body.prazo_contrato || null,
        categoria_contrato: body.categoria_contrato || null,
        tipo_trabalho: body.tipo_trabalho || null,
        tipo_mao_de_obra: body.tipo_mao_de_obra || null,
        regime_trabalho: body.regime_trabalho || null,
        escala_embarque: body.escala_embarque || null,
        escala_folga: body.escala_folga || null,
        status_embarque: body.status_embarque || 'desembarcado',
        dados_saude: body.dados_saude || null,
        tipo_admissao: body.tipo_admissao || null,
        natureza_atividade: body.natureza_atividade || null,
        tipo_jornada: body.tipo_jornada || null,
        tipo_lotacao: body.tipo_lotacao || null,
        origem: 'manual',
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Erro ao criar colaborador:', createError);
      return NextResponse.json({ error: 'Erro ao criar colaborador' }, { status: 500 });
    }

    if (newColaborador && newColaborador.id) {
      // Enrich with MIO data in background
      const rawCpf = newColaborador.cpf || '';
      const cleanCpf = rawCpf.replace(/\D/g, '');

      if (cleanCpf) {
        enrichComMIOData(newColaborador.id, cleanCpf).catch(err => {
          console.error('[MIO Enrich] Failed:', err);
        });
      }

      // Run auto event generation in background
      autoGenerateESocialEvents(newColaborador.id).catch(err => {
        console.error('[eSocialAuto] Failed in background execution:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: newColaborador
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar colaborador:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

async function enrichComMIOData(colaboradorId: string, cleanCpf: string): Promise<void> {
  try {
    // 1. Check mio_cache first
    let mioData: any = null;
    const { data: cacheRow } = await supabaseAdmin
      .from('mio_cache')
      .select('dados, atualizado_em')
      .eq('tipo', 'integrantes')
      .maybeSingle();

    const cacheData = cacheRow?.dados;
    if (Array.isArray(cacheData)) {
      mioData = cacheData.find((i: any) => {
        const c = (i.cpf || i.cpf_numero || '').replace(/\D/g, '');
        return c === cleanCpf;
      });
    }

    // 2. Fallback to MIO API directly only if cache is older than 5 minutes
    if (!mioData) {
      const lastUpdated = cacheRow?.atualizado_em ? new Date(cacheRow.atualizado_em).getTime() : 0;
      const isCacheRecent = (Date.now() - lastUpdated) < 5 * 60 * 1000; // 5 minutos

      if (!isCacheRecent) {
        console.log(`[MIO Enrich] CPF ${cleanCpf} not found in cache. Cache is stale (${Math.round((Date.now() - lastUpdated)/1000)}s old). Fetching fresh data from MIO...`);
        const integrantes = await mioClient.getIntegrantes();
        if (Array.isArray(integrantes)) {
          mioData = integrantes.find(i => {
            const c = (i.cpf || '').replace(/\D/g, '');
            return c === cleanCpf;
          });
        }
      } else {
        console.log(`[MIO Enrich] CPF ${cleanCpf} not found in cache. Cache is recent (${Math.round((Date.now() - lastUpdated)/1000)}s old). Skipping MIO API fallback.`);
      }
    }

    if (!mioData) {
      console.log(`[MIO Enrich] CPF ${cleanCpf} not found in MIO. Storing as manual-only.`);
      return;
    }

    // 3. Update collaborator with MIO data
    const updateFields: Record<string, any> = {
      origem: 'mio',
      mio_id: mioData.id ? String(mioData.id) : undefined,
      mio_data: mioData,
      matricula: mioData.matricula || undefined,
      email: mioData.email || undefined,
      telefone: mioData.celular || mioData.telefone || undefined,
      data_nascimento: mioData.data_nascimento || undefined,
      nome_mae: mioData.nome_mae || undefined,
      nome_pai: mioData.nome_pai || undefined,
      data_admissao: mioData.data_admissao || undefined,
      data_demissao: mioData.data_demissao || undefined,
      dados_bancarios: mioData.dados_bancarios || undefined,
      updated_at: new Date().toISOString(),
    };

    Object.keys(updateFields).forEach(k => {
      if (updateFields[k] === undefined) delete updateFields[k];
    });

    await supabaseAdmin
      .from('gt_colaboradores')
      .update(updateFields)
      .eq('id', colaboradorId);

    console.log(`[MIO Enrich] Collaborator ${colaboradorId} enriched with MIO data (ID: ${mioData.id})`);
  } catch (err) {
    console.error(`[MIO Enrich] Error enriching collaborator ${colaboradorId}:`, err);
  }
}
