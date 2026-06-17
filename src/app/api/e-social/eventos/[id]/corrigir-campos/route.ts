import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { validarEPrepararEnvio } from '@/lib/e-social/preEnvioGateway';
import { updateEvento, logEnvio } from '@/services/eSocialService';

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
    const body = await request.json();
    const campos = body.campos || {};

    const { data: evento, error: fetchError } = await supabaseAdmin
      .from('esocial_eventos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !evento) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    // Merge os novos campos nos dados do evento
    const dadosAtualizados = JSON.parse(JSON.stringify(evento.dados_evento || { dadosEspecificos: {} }));
    if (!dadosAtualizados.dadosEspecificos) dadosAtualizados.dadosEspecificos = {};

    Object.keys(campos).forEach(k => {
      // Aplicar tanto na raiz quanto no dadosEspecificos
      dadosAtualizados[k] = campos[k];
      dadosAtualizados.dadosEspecificos[k] = campos[k];
    });

    evento.dados_evento = dadosAtualizados;

    const { data: configGeral } = await supabaseAdmin
      .from('esocial_configuracoes')
      .select('valor')
      .eq('chave', 'geral')
      .maybeSingle();
      
    const isProducao = configGeral?.valor?.ambiente === 'producao';
    const tpAmbValue = isProducao ? 1 : 2;

    const result = await validarEPrepararEnvio(evento, tpAmbValue);

    if (result.pronto) {
      const updateData: any = {
        dados_evento: result.dadosCorrigidos || dadosAtualizados,
        xml_gerado: result.xml,
        status: 'revisao_aprovado',
        ultimo_erro: null,
        erros_processamento: null
      };

      await updateEvento(id, updateData);

      await logEnvio({
        evento_id: id,
        acao: 'correcao_campos',
        request_body: JSON.stringify(campos),
        response_body: result.xml,
        sucesso: true
      });

      Object.assign(evento, updateData);
    } else {
      // Salva os dados parciais mesmo se ainda não estiver pronto
      await updateEvento(id, { dados_evento: result.dadosCorrigidos || dadosAtualizados });
    }

    return NextResponse.json({ ...result, evento });
  } catch (error: any) {
    console.error('Erro na rota de correção:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
