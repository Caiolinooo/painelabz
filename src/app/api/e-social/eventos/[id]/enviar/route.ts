import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { enviarEvento } from '@/lib/e-social/client';
import { generateEventXML, validateEventXML, validateEventData, updateEvento, logEnvio } from '@/services/eSocialService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || undefined);
    if (!token) {
      const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
      if (tokenCookie) token = tokenCookie.value;
    }
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    const { data: evento, error: fetchError } = await supabaseAdmin
      .from('esocial_eventos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'Erro ao buscar evento' }, { status: 500 });
    }
    if (!evento) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const statusesPermitidos = ['revisao_aprovado', 'fila_envio', 'erro'];
    if (!statusesPermitidos.includes(evento.status)) {
      return NextResponse.json({
        error: `Evento no status "${evento.status}" não pode ser enviado. Status esperados: ${statusesPermitidos.join(', ')}`,
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (evento.protocolo_envio && !force) {
      return NextResponse.json({
        error: 'Este evento já possui protocolo de envio e pode já ter sido transmitido ao e-Social. Consulte o protocolo antes de reenviar.',
        code: 'HAS_PROTOCOL',
      }, { status: 400 });
    }

    const { data: duplicatas, error: dupError } = await supabaseAdmin
      .from('esocial_eventos')
      .select('id, evento_codigo, status, protocolo_envio, data_envio, numero_recibo')
      .eq('evento_codigo', evento.evento_codigo)
      .eq('cpf_trabalhador', evento.cpf_trabalhador)
      .in('status', ['enviado', 'processado', 'fila_envio'])
      .neq('id', id);

    if (!dupError && duplicatas && duplicatas.length > 0) {
      return NextResponse.json({
        error: `Já existe(m) ${duplicatas.length} evento(s) do tipo ${evento.evento_codigo} para o CPF ${evento.cpf_trabalhador} com status "enviado" ou "processado". Consulte o protocolo antes de reenviar.`,
        duplicatas,
      }, { status: 409 });
    }

    const { data: certificado } = await supabaseAdmin
      .from('esocial_certificados')
      .select('*')
      .eq('ativo', true)
      .maybeSingle();

    if (!certificado) {
      return NextResponse.json({
        error: 'Nenhum certificado digital ativo encontrado. Configure um certificado A1/A3 antes de enviar.',
      }, { status: 400 });
    }

    const { data: configGeral } = await supabaseAdmin
      .from('esocial_configuracoes')
      .select('valor')
      .eq('chave', 'geral')
      .maybeSingle();
    const isProducao = configGeral?.valor?.ambiente === 'producao';
    const tpAmbValue = isProducao ? 1 : 2;

    const xmlContemAmbIncorrecto = evento.xml_gerado && 
      (isProducao ? evento.xml_gerado.includes('<tpAmb>2</tpAmb>') : evento.xml_gerado.includes('<tpAmb>1</tpAmb>'));

    // Detecta o bug histórico do S-2220: <aso><resAso> sem <dtAso> antes (schema inválido)
    const xmlContemBugAso = evento.xml_gerado &&
      evento.evento_codigo === 'S-2220' &&
      /<aso>\s*<resAso>/.test(evento.xml_gerado);

    // Detecta datas inválidas no XML (ex: mês 13 ou dia 13 como mês — YYYY-13-DD)
    const xmlContemDataInvalida = evento.xml_gerado &&
      /\d{4}-(1[3-9]|[2-9]\d)-\d{2}/.test(evento.xml_gerado);

    if (!evento.xml_gerado || xmlContemAmbIncorrecto || xmlContemBugAso || xmlContemDataInvalida) {
      try {
        const raw = evento.dados_evento?.dadosEspecificos || evento.dados_evento || {};
        const eventData = {
          cpf: evento.cpf_trabalhador || '',
          cnpj: evento.cnpj_empregador || '',
          tpAmb: tpAmbValue,
          indRetif: evento.dados_evento?.indRetif || 1,
          matricula: evento.matricula || '',
          dadosEspecificos: {
            tipoExame: raw.tipoExame || raw.tipo_exame || 'periodico',
            dataRealizacao: raw.dataRealizacao || raw.data_realizacao || '',
            resultado: raw.resultado || 'apto',
            medico_nome: raw.medico || raw.medico_nome || raw.nmMed || '',
            medico_crm: raw.crm || raw.medico_crm || raw.nrCRM || '',
            medico_uf: raw.uf || raw.medico_uf || raw.ufCRM || 'RJ',
            medico_pcmso_nome: raw.medico_pcmso_nome || raw.medicoPcmsoNome || raw.medico_pcmso || '',
            medico_pcmso_crm: raw.medico_pcmso_crm || raw.medicoPcmsoCrm || raw.crm_pcmso || '',
            medico_pcmso_uf: raw.medico_pcmso_uf || raw.medicoPcmsoUf || raw.uf_pcmso || 'RJ',
            exames_realizados: raw.exames_realizados || raw.exames || [],
            nome_clinica: raw.nome_clinica || raw.nomeClinica || '',
            matricula: evento.matricula || '',
          },
        };

        const dataValidation = validateEventData(evento.evento_codigo, eventData);

        if (dataValidation.valido) {
          const xml = generateEventXML(evento.evento_codigo, eventData);
          const xmlValidation = validateEventXML(xml);

          if (xmlValidation.valido) {
            await updateEvento(evento.id, { xml_gerado: xml });
            evento.xml_gerado = xml;

            await logEnvio({
              evento_id: evento.id,
              acao: 'geracao_xml',
              request_body: JSON.stringify(eventData),
              response_body: xml,
              sucesso: true,
            });
          } else {
            return NextResponse.json({
              error: `Evento não possui XML gerado e a regeneração automática falhou na validação: ${xmlValidation.erros.join('; ')}`,
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({
            error: `Evento não possui XML gerado e os dados salvos são insuficientes para regenerar: ${dataValidation.erros.join('; ')}`,
          }, { status: 400 });
        }
      } catch (regErr: any) {
        return NextResponse.json({
          error: `Evento não possui XML gerado e a regeneração automática encontrou um erro: ${regErr.message || regErr}`,
        }, { status: 400 });
      }
    }

    const statusAntes = evento.status;

    await supabaseAdmin
      .from('esocial_eventos')
      .update({
        status: 'enviando',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await supabaseAdmin.from('esocial_envios_log').insert({
      evento_id: id,
      acao: 'envio',
      request_body: ***REMOVED***
        certificado: certificado.nome,
        acao_interna: 'envio_iniciado',
        status_antes: statusAntes,
        status_depois: 'enviando',
      }),
      sucesso: true,
    });

    const result = await enviarEvento({
      xml: evento.xml_gerado,
      codigoEvento: evento.evento_codigo,
      certificadoId: certificado.id,
      cnpjEmpregador: evento.cnpj_empregador || undefined,
    });

    const now = new Date().toISOString();

    if (result.sucesso) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('esocial_eventos')
        .update({
          status: 'enviado',
          protocolo_envio: result.protocolo,
          numero_recibo: result.numeroRecibo,
          data_envio: now,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single();

      await supabaseAdmin.from('esocial_envios_log').insert({
        evento_id: id,
        acao: 'envio',
        request_body: ***REMOVED***
          protocolo: result.protocolo,
          recibo: result.numeroRecibo,
          acao_interna: 'envio_sucesso',
        }),
        response_body: JSON.stringify(result),
        status_code: 200,
        sucesso: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Evento enviado ao E-Social com sucesso',
        evento: updated || evento,
        protocolo: result.protocolo,
        recibo: result.numeroRecibo,
      });
    }

    const erroMsg = result.erros.join('; ');

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('esocial_eventos')
      .update({
        status: 'erro',
        erros_processamento: result.erros,
        ultimo_erro: erroMsg,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    await supabaseAdmin.from('esocial_envios_log').insert({
      evento_id: id,
      acao: 'envio',
      request_body: ***REMOVED*** erro: erroMsg, acao_interna: 'envio_erro' }),
      response_body: erroMsg,
      status_code: 500,
      sucesso: false,
      mensagem_erro: erroMsg,
    });

    return NextResponse.json({
      success: false,
      message: 'Erro ao enviar evento para o E-Social',
      evento: updated || evento,
      erro: erroMsg,
    }, { status: 500 });
  } catch (error) {
    console.error('Erro em POST /api/e-social/eventos/[id]/enviar:', error);

    try {
      const { id } = await params;
      await supabaseAdmin.from('esocial_envios_log').insert({
        evento_id: id,
        acao: 'envio',
        request_body: ***REMOVED*** acao_interna: 'envio_erro_critico' }),
        response_body: error instanceof Error ? error.message : 'Erro interno',
        status_code: 500,
        sucesso: false,
        mensagem_erro: error instanceof Error ? error.message : 'Erro interno',
      });
    } catch {}

    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
