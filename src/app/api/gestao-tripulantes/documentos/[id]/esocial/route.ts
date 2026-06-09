import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { generateEventXML, validateEventXML, validateEventData, updateEvento, logEnvio, STATUS_EVENTO } from '@/services/eSocialService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { id: docId } = await context.params;

    // Fetch document with collaborator's matricula
    const { data: doc, error: docError } = await supabaseAdmin
      .from('gt_documentos')
      .select('*, colaborador:gt_colaboradores!colaborador_id(id, nome_completo, cpf, matricula, matricula_esocial)')
      .eq('id', docId)
      .is('deleted_at', null)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    if (doc.tipo_documento !== 'aso') {
      return NextResponse.json({ error: 'Documento não é um ASO' }, { status: 400 });
    }

    const colaborador = doc.colaborador as any;

    const { data: asoData, error: asoError } = await supabaseAdmin
      .from('gt_documentos_aso')
      .select('*')
      .eq('documento_id', docId)
      .maybeSingle();

    if (asoError || !asoData) {
      return NextResponse.json({ error: 'Dados detalhados do ASO não encontrados. Execute o OCR primeiro.' }, { status: 400 });
    }

    // Check if already queued
    if (['enviado', 'processado', 'pendente', 'pendente_revisao'].includes(asoData.esocial_status || '')) {
      return NextResponse.json({ error: 'ASO já foi processado para o E-Social' }, { status: 400 });
    }

    // Fetch CNPJ of the collaborator's employer company
    let cnpj = '';
    if (doc.colaborador_id) {
      const { data: colabCnpj } = await supabaseAdmin
        .from('gt_colaboradores')
        .select('gt_empresas!empresa_id(cnpj)')
        .eq('id', doc.colaborador_id)
        .maybeSingle();
      const rawCnpj = (colabCnpj as any)?.gt_empresas?.cnpj || '';
      cnpj = rawCnpj.replace(/\D/g, '');
    }

    const cpfLimpo = (colaborador?.cpf || '').replace(/\D/g, '');

    // Create e-Social event record (S-2220 - Monitoramento da Saúde do Trabalhador)
    const { data: evento, error: eventoError } = await supabaseAdmin
      .from('esocial_eventos')
      .insert({
        evento_codigo: 'S-2220',
        cpf_trabalhador: cpfLimpo,
        cnpj_empregador: cnpj || null,
        matricula: colaborador?.matricula_esocial || colaborador?.matricula || null,
        dados_evento: {
          documento_id: docId,
          colaborador_id: doc.colaborador_id,
          tipo_exame: asoData.tipo_exame || 'periodico',
          data_realizacao: asoData.data_realizacao || doc.data_emissao,
          resultado: asoData.resultado || 'apto',
          medico_nome: asoData.medico_nome,
          medico_crm: asoData.medico_crm,
          medico_uf: asoData.medico_uf,
          medico_pcmso_nome: asoData.medico_pcmso_nome,
          medico_pcmso_crm: asoData.medico_pcmso_crm,
          medico_pcmso_uf: asoData.medico_pcmso_uf,
          exames_realizados: asoData.exames_realizados,
          nome_clinica: asoData.nome_clinica,
          data_validade: doc.data_validade,
          matricula_esocial: colaborador?.matricula_esocial || '',
          matricula: colaborador?.matricula || '',
        },
        status: 'pendente_revisao',
        modulo_origem: 'ocr',
        entidade_origem_id: docId,
        entidade_origem_tipo: 'aso'
      })
      .select('id')
      .single();

    if (eventoError) {
      console.error('Erro ao criar evento E-Social:', eventoError);
      return NextResponse.json({ error: 'Erro ao criar evento E-Social no banco de dados' }, { status: 500 });
    }

    // Generate XML for the S-2220 event
    let xmlGerado = '';
    let xmlValido = false;
    let errosValidacao: string[] = [];

    try {
      const eventData = {
        cpf: cpfLimpo,
        cnpj,
        tpAmb: 2,
        indRetif: 1,
        matricula: (colaborador as any)?.matricula_esocial || (colaborador as any)?.matricula || '',
        dadosEspecificos: {
          tipoExame: asoData.tipo_exame || 'periodico',
          dataRealizacao: asoData.data_realizacao || doc.data_emissao,
          resultado: asoData.resultado || 'apto',
          medico_nome: asoData.medico_nome || '',
          medico_crm: asoData.medico_crm || '',
          medico_uf: asoData.medico_uf || '',
          medico_pcmso_nome: asoData.medico_pcmso_nome || '',
          medico_pcmso_crm: asoData.medico_pcmso_crm || '',
          medico_pcmso_uf: asoData.medico_pcmso_uf || '',
          exames_realizados: asoData.exames_realizados || [],
          nome_clinica: asoData.nome_clinica || '',
          matricula_esocial: (colaborador as any)?.matricula_esocial || '',
          matricula: (colaborador as any)?.matricula || '',
        },
      };

      const dataValidation = validateEventData('S-2220', eventData);

      if (dataValidation.valido) {
        xmlGerado = generateEventXML('S-2220', eventData);
        const xmlValidation = validateEventXML(xmlGerado);
        xmlValido = xmlValidation.valido;
        if (!xmlValido) errosValidacao = xmlValidation.erros;
      } else {
        errosValidacao = dataValidation.erros;
      }

      if (xmlGerado) {
        await updateEvento(evento.id, { xml_gerado: xmlGerado });
      }

      await logEnvio({
        evento_id: evento.id,
        acao: 'geracao_xml',
        request_body: JSON.stringify(eventData),
        response_body: xmlGerado || undefined,
        sucesso: xmlValido,
        mensagem_erro: errosValidacao.length > 0 ? errosValidacao.join('; ') : undefined,
      });
    } catch (xmlErr) {
      console.error('[S-2220] Erro ao gerar XML:', xmlErr);
    }

    // Update ASO document esocial_status
    await supabaseAdmin
      .from('gt_documentos_aso')
      .update({
        esocial_status: 'pendente',
        esocial_evento_id: evento.id,
        updated_at: new Date().toISOString()
      })
      .eq('documento_id', docId);

    return NextResponse.json({
      success: true,
      data: { evento_id: evento.id, status: 'pendente_revisao' }
    });
  } catch (error) {
    console.error('Erro ao processar E-Social:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
