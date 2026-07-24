import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createEvento, validateEventData, generateEventXML, validateEventXML, logEnvio, STATUS_EVENTO } from '@/services/eSocialService';

// GET: list acidentes for a collaborator
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colaboradorId = searchParams.get('colaborador_id');

    if (!colaboradorId) {
      return NextResponse.json({ error: 'colaborador_id obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('gt_acidentes')
      .select('*, gt_colaboradores:colaborador_id (nome_completo, cpf, matricula)')
      .eq('colaborador_id', colaboradorId)
      .is('deleted_at', null)
      .order('dt_acidente', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ acidentes: data || [] });
  } catch (err: any) {
    console.error('[acidentes] GET error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: create acidente (CAT) + auto-generate S-2210
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      colaborador_id,
      dt_acidente,
      hr_acidente,
      tp_acidente,
      tp_cat = 'inicial',
      dt_obito,
      hrs_trab_antes,
      tp_local,
      dsc_local,
      cod_sit_geradora,
      iniciat_cat,
      obs_cat,
      ult_dia_trab,
      houve_afast = false,
      dt_ini_afast,
      parte_atingida_cod,
      parte_atingida_lateralidade,
      agente_causador_cod,
      local_acidente,
      auto_esocial = true,
    } = body;

    if (!colaborador_id || !dt_acidente || !tp_acidente) {
      return NextResponse.json(
        { error: 'colaborador_id, dt_acidente e tp_acidente são obrigatórios' },
        { status: 400 }
      );
    }

    const tpAcidMap: Record<string, string> = { tipico: '1', doenca: '2', trajeto: '3' };
    const tpCatMap: Record<string, string> = { inicial: '1', reabertura: '2', comunicacao_obito: '3' };

    const { data: acidente, error: insertErr } = await supabaseAdmin
      .from('gt_acidentes')
      .insert({
        colaborador_id,
        dt_acidente,
        hr_acidente,
        tp_acidente,
        tp_cat,
        dt_obito,
        hrs_trab_antes,
        tp_local,
        dsc_local,
        cod_sit_geradora,
        iniciat_cat,
        obs_cat,
        ult_dia_trab,
        houve_afast,
        dt_ini_afast,
        parte_atingida_cod,
        parte_atingida_lateralidade,
        agente_causador_cod,
        local_acidente,
        esocial_status: 'nao_enviado',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Auto-generate S-2210 event
    if (auto_esocial && acidente) {
      await autoGenerateS2210(acidente, tpAcidMap, tpCatMap);
    }

    return NextResponse.json({ acidente }, { status: 201 });
  } catch (err: any) {
    console.error('[acidentes] POST error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function autoGenerateS2210(
  acidente: any,
  tpAcidMap: Record<string, string>,
  tpCatMap: Record<string, string>
) {
  try {
    const { data: colab } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('cpf, matricula, nome_completo, gt_empresas:empresa_id (cnpj)')
      .eq('id', acidente.colaborador_id)
      .maybeSingle();

    if (!colab?.cpf) return;

    const cleanCpf = colab.cpf.replace(/\D/g, '');
    const cnpj = ((colab as any).gt_empresas?.cnpj || '').replace(/\D/g, '');

    const payload = {
      cnpj,
      cpf: cleanCpf,
      matricula: colab.matricula || '',
      dadosEspecificos: {
        dtAcid: acidente.dt_acidente,
        hrAcid: acidente.hr_acidente,
        tpAcid: tpAcidMap[acidente.tp_acidente] || acidente.tp_acidente,
        tpCat: tpCatMap[acidente.tp_cat] || acidente.tp_cat,
        dtObito: acidente.dt_obito,
        hrsTrabAntes: acidente.hrs_trab_antes,
        tpLocal: acidente.tp_local,
        dscLocal: acidente.dsc_local,
        codSitGeradora: acidente.cod_sit_geradora,
        iniciatCat: acidente.iniciat_cat || '1',
        obsCat: acidente.obs_cat,
        ultDiaTrab: acidente.ult_dia_trab,
        houveAfast: acidente.houve_afast,
        dtIniAfast: acidente.dt_ini_afast,
        parteAtingidaCod: acidente.parte_atingida_cod,
        parteAtingidaLateralidade: acidente.parte_atingida_lateralidade,
        agenteCausadorCod: acidente.agente_causador_cod,
        localAcidente: acidente.local_acidente,
      },
    };

    const dataValidation = validateEventData('S-2210', payload);
    let xml = '';
    let xmlValidation = { valido: false, erros: [] as string[] };

    if (dataValidation.valido) {
      try {
        xml = generateEventXML('S-2210', payload);
        xmlValidation = validateEventXML(xml);
      } catch (e: any) {
        xmlValidation.erros.push(e.message);
      }
    }

    const isValid = dataValidation.valido && xmlValidation.valido;
    const finalStatus = isValid ? STATUS_EVENTO.PENDENTE_REVISAO : STATUS_EVENTO.RASCUNHO;

    const event = await createEvento({
      evento_codigo: 'S-2210',
      cpf_trabalhador: cleanCpf,
      cnpj_empregador: cnpj || undefined,
      matricula: colab.matricula || undefined,
      dados_evento: payload,
      status: finalStatus,
      modulo_origem: 'gestao-tripulantes',
      entidade_origem_id: acidente.id,
      entidade_origem_tipo: 'gt_acidentes',
    });

    // Link back
    await supabaseAdmin
      .from('gt_acidentes')
      .update({
        esocial_status: 'pendente',
        esocial_evento_id: event.id,
      })
      .eq('id', acidente.id);

    await logEnvio({
      evento_id: event.id,
      acao: 'geracao_xml',
      request_body: JSON.stringify(payload),
      response_body: xml || undefined,
      sucesso: isValid,
      mensagem_erro: isValid ? undefined : [...dataValidation.erros, ...xmlValidation.erros].join('; '),
    });

    console.log(`[acidentes] S-2210 auto-generated for acidente ${acidente.id}`);
  } catch (err) {
    console.error('[acidentes] Error auto-generating S-2210:', err);
  }
}
