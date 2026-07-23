import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { enviarEvento } from '@/lib/e-social/client';
import { generateEventXML, validateEventXML, validateEventData, updateEvento, logEnvio } from '@/services/eSocialService';
import { validarEPrepararEnvio } from '@/lib/e-social/preEnvioGateway';
import { syncAsoEsocialStatusFromEvento } from '@/lib/gestao-tripulantes/aso-esocial-sync';

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

    // === Gateway de Pré-Envio: validação + auto-correção + rebuild XML ===
    const { data: configGeral } = await supabaseAdmin
      .from('esocial_configuracoes')
      .select('valor')
      .eq('chave', 'geral')
      .maybeSingle();
    const isProducao = configGeral?.valor?.ambiente === 'producao';
    const tpAmbValue = isProducao ? 1 : 2;

    let xmlParaEnvio = evento.xml_gerado || '';
    try {
      const gatewayResult = await validarEPrepararEnvio(evento, tpAmbValue);

      if (!gatewayResult.pronto) {
        // Se há campos pendentes, o usuário precisa corrigir via UI
        if (gatewayResult.camposPendentes.length > 0) {
          return NextResponse.json({
            error: 'Evento possui campos obrigatórios pendentes que precisam ser preenchidos antes do envio.',
            camposPendentes: gatewayResult.camposPendentes,
            erros: gatewayResult.erros,
            correcoesAplicadas: gatewayResult.correcoesAplicadas,
          }, { status: 400 });
        }
        // Erros estruturais que não podem ser corrigidos
        return NextResponse.json({
          error: `Validação pré-envio falhou: ${gatewayResult.erros.join('; ')}`,
          erros: gatewayResult.erros,
        }, { status: 400 });
      }

      // Gateway retornou XML válido — usar o XML do gateway
      xmlParaEnvio = gatewayResult.xml || xmlParaEnvio;

      // Persistir correções e XML regenerado se houve mudanças
      if (gatewayResult.correcoesAplicadas.length > 0 || gatewayResult.xml) {
        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (gatewayResult.xml) updatePayload.xml_gerado = gatewayResult.xml;
        if (gatewayResult.dadosCorrigidos) updatePayload.dados_evento = gatewayResult.dadosCorrigidos;

        await supabaseAdmin
          .from('esocial_eventos')
          .update(updatePayload)
          .eq('id', id);

        evento.xml_gerado = xmlParaEnvio;

        await logEnvio({
          evento_id: evento.id,
          acao: 'geracao_xml',
          request_body: JSON.stringify({
            correcoesAplicadas: gatewayResult.correcoesAplicadas,
            acao_interna: 'gateway_pre_envio',
          }),
          response_body: xmlParaEnvio,
          sucesso: true,
        });
      }
    } catch (gatewayErr: any) {
      console.error('[Enviar] Erro no gateway de pré-envio:', gatewayErr);
      // Fallback: se o gateway falhar, tentar enviar com o XML existente
      if (!xmlParaEnvio) {
        return NextResponse.json({
          error: `Validação pré-envio falhou: ${gatewayErr.message || gatewayErr}`,
        }, { status: 400 });
      }
    }

    // Garantir que temos XML para enviar
    if (!xmlParaEnvio) {
      return NextResponse.json({
        error: 'Evento não possui XML gerado e a validação pré-envio não conseguiu gerar um XML válido.',
      }, { status: 400 });
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
      request_body: JSON.stringify({
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
        request_body: JSON.stringify({
          protocolo: result.protocolo,
          recibo: result.numeroRecibo,
          acao_interna: 'envio_sucesso',
        }),
        response_body: JSON.stringify(result),
        status_code: 200,
        sucesso: true,
      });

      await syncAsoEsocialStatusFromEvento({
        eventoId: id,
        status: 'enviado',
        protocolo: result.protocolo,
        numeroRecibo: result.numeroRecibo,
        entidadeOrigemId: evento.entidade_origem_id,
        entidadeOrigemTipo: evento.entidade_origem_tipo,
        eventoCodigo: evento.evento_codigo,
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
      request_body: JSON.stringify({ erro: erroMsg, acao_interna: 'envio_erro' }),
      response_body: erroMsg,
      status_code: 500,
      sucesso: false,
      mensagem_erro: erroMsg,
    });

    await syncAsoEsocialStatusFromEvento({
      eventoId: id,
      status: 'erro',
      entidadeOrigemId: evento.entidade_origem_id,
      entidadeOrigemTipo: evento.entidade_origem_tipo,
      eventoCodigo: evento.evento_codigo,
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
        request_body: JSON.stringify({ acao_interna: 'envio_erro_critico' }),
        response_body: error instanceof Error ? error.message : 'Erro interno',
        status_code: 500,
        sucesso: false,
        mensagem_erro: error instanceof Error ? error.message : 'Erro interno',
      });
    } catch {}

    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
