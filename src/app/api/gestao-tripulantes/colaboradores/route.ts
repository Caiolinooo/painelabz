import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { autoGenerateESocialEvents } from '@/services/eSocialAutoService';
import { findColaboradorByCpf } from '@/lib/gestao-tripulantes/cpf-lookup';
import { flattenColaboradorRow, LIST_SELECT } from '@/lib/gestao-tripulantes/colaborador-get';
import { normalizeCpf } from '@/lib/gestao-tripulantes/cpf';
import { classificarValidadeCivil, dataLocalISO } from '@/lib/gestao-tripulantes/aso-vencimentos';

export const dynamic = 'force-dynamic';

async function resolveNomeToId(table: string, nome: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from(table)
    .select('id')
    .eq('nome', nome)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  const t0 = Date.now();
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
    const cpfParam = searchParams.get('cpf');
    const lite = searchParams.get('lite') === '1';
    const empresa = searchParams.get('empresa');
    const embarcacao = searchParams.get('embarcacao');
    const cargo = searchParams.get('cargo');
    const centroCusto = searchParams.get('centro_custo');
    const status = searchParams.get('status');
    const standby = searchParams.get('standby');
    const ativo = searchParams.get('ativo');
    const onlyVencidos = searchParams.get('onlyVencidos');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const cpfLookup = cpfParam || (search && normalizeCpf(search).length === 11 ? search : null);
    let cpfMatchId: string | null = null;
    if (cpfLookup) {
      const found = await findColaboradorByCpf(cpfLookup);
      if (!found) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page: 1, limit, total: 0, totalPages: 0 },
        });
      }
      if (lite) {
        console.log(`[GT GET /colaboradores?cpf=lite] ${Date.now() - t0}ms`);
        return NextResponse.json({
          success: true,
          data: [{ id: found.id, nome_completo: found.nome_completo, cpf: found.cpf }],
          pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
        });
      }
      cpfMatchId = found.id;
    }

    const [empresaId, embarcacaoId, cargoId, centroId] = await Promise.all([
      empresa ? resolveNomeToId('gt_empresas', empresa) : Promise.resolve(null),
      embarcacao ? resolveNomeToId('gt_embarcacoes', embarcacao) : Promise.resolve(null),
      cargo ? resolveNomeToId('gt_cargos', cargo) : Promise.resolve(null),
      centroCusto ? resolveNomeToId('gt_centros_custo', centroCusto) : Promise.resolve(null),
    ]);

    if (empresa && !empresaId) {
      return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    let vencidoIds: string[] | null = null;
    if (onlyVencidos === 'true') {
      const hoje = dataLocalISO();
      const vencidoSet = new Set<string>();
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data: vencidos, error: vencidosErr } = await supabaseAdmin
          .from('gt_documentos')
          .select('colaborador_id')
          .is('deleted_at', null)
          .not('data_validade', 'is', null)
          .lt('data_validade', hoje)
          .not('colaborador_id', 'is', null)
          .range(from, from + pageSize - 1);
        if (vencidosErr) {
          console.error('Erro ao filtrar documentos vencidos:', vencidosErr);
          return NextResponse.json({ error: 'Erro ao listar colaboradores' }, { status: 500 });
        }
        const rows = vencidos || [];
        for (const d of rows) {
          if (d.colaborador_id) vencidoSet.add(d.colaborador_id as string);
        }
        if (rows.length < pageSize) break;
        from += pageSize;
      }
      vencidoIds = Array.from(vencidoSet);
      if (vencidoIds.length === 0) {
        return NextResponse.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
    }

    let query = supabaseAdmin
      .from('gt_colaboradores')
      .select(LIST_SELECT, { count: 'exact' })
      .is('deleted_at', null);

    if (cpfMatchId) {
      query = query.eq('id', cpfMatchId);
    } else if (search) {
      query = query.or(
        `nome_completo.ilike.%${search}%,matricula.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    if (empresaId) query = query.eq('empresa_id', empresaId);
    if (embarcacaoId) query = query.eq('embarcacao_atual_id', embarcacaoId);
    if (cargoId) query = query.eq('cargo_id', cargoId);
    if (centroId) query = query.eq('centro_custo_id', centroId);
    if (status) query = query.eq('status_embarque', status);
    if (standby === 'true') query = query.eq('standby', true);
    if (standby === 'false') query = query.eq('standby', false);
    if (ativo === 'true' || ativo === 'ativos' || ativo === 'ativo') query = query.eq('ativo', true);
    if (ativo === 'false' || ativo === 'inativos' || ativo === 'inativo') query = query.eq('ativo', false);
    if (vencidoIds) query = query.in('id', vencidoIds);

    const { data: rows, error, count } = await query
      .order('nome_completo', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Erro ao listar colaboradores:', error);
      return NextResponse.json({ error: 'Erro ao listar colaboradores' }, { status: 500 });
    }

    const flattened = (rows || []).map((row) => flattenColaboradorRow(row as Record<string, unknown>));
    const ids = flattened.map((c) => c.id as string).filter(Boolean);

    const countsById: Record<string, { qtd_docs_vencidos: number; qtd_docs_vencendo: number; qtd_docs_validos: number }> = {};
    if (ids.length > 0) {
      const docRows: { colaborador_id: string; data_validade: string | null; status_validacao: string | null }[] = [];
      const docPageSize = 1000;
      let docFrom = 0;
      while (true) {
        const { data: pageDocs } = await supabaseAdmin
          .from('gt_documentos')
          .select('colaborador_id, data_validade, status_validacao')
          .in('colaborador_id', ids)
          .is('deleted_at', null)
          .range(docFrom, docFrom + docPageSize - 1);
        const page = pageDocs || [];
        docRows.push(...(page as typeof docRows));
        if (page.length < docPageSize) break;
        docFrom += docPageSize;
      }
      const hoje = dataLocalISO();
      for (const id of ids) {
        countsById[id] = { qtd_docs_vencidos: 0, qtd_docs_vencendo: 0, qtd_docs_validos: 0 };
      }
      for (const d of docRows || []) {
        const bucket = countsById[d.colaborador_id];
        if (!bucket) continue;
        const alerta = classificarValidadeCivil(d.data_validade, hoje);
        if (alerta === 'vencido') bucket.qtd_docs_vencidos += 1;
        else if (alerta === 'vencendo') bucket.qtd_docs_vencendo += 1;
        else if (alerta === 'valido' || (!d.data_validade && d.status_validacao === 'valido')) {
          bucket.qtd_docs_validos += 1;
        }
      }
    }

    const colaboradores = flattened.map((c) => ({
      ...c,
      ...(countsById[c.id as string] || { qtd_docs_vencidos: 0, qtd_docs_vencendo: 0, qtd_docs_validos: 0 }),
    }));

    console.log(`[GT GET /colaboradores list] ${Date.now() - t0}ms n=${colaboradores.length}`);

    return NextResponse.json({
      success: true,
      data: colaboradores,
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

    // 2. Local-only: never live-GET MIO on the request path.
    if (!mioData) {
      console.log(`[MIO Enrich] CPF ${cleanCpf} not in mio_cache. Runtime stays local; run admin MIO pull to refresh cache.`);
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
