import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { consultarProtocolo } from '@/lib/e-social/client';

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

    if (!evento.protocolo_envio) {
      return NextResponse.json({ error: 'Evento não possui protocolo de envio' }, { status: 400 });
    }

    const resultado = await consultarProtocolo(evento.protocolo_envio);

    const now = new Date().toISOString();
    const updateData: Record<string, any> = {
      retorno_completo: resultado,
      data_processamento: now,
      updated_at: now,
    };

    if (resultado.situacao === 'PROCESSADO') {
      updateData.status = 'processado';
      if (resultado.numeroRecibo) updateData.numero_recibo = resultado.numeroRecibo;
    } else if (resultado.situacao === 'ERRO' || resultado.situacao === 'REJEITADO') {
      updateData.status = 'erro';
      updateData.erros_processamento = resultado.erros;
      updateData.ultimo_erro = resultado.erros.join('; ');
    }

    const { data: updated } = await supabaseAdmin
      .from('esocial_eventos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    await supabaseAdmin.from('esocial_envios_log').insert({
      evento_id: id,
      acao: 'consulta',
      request_body: ***REMOVED*** protocolo: evento.protocolo_envio }),
      response_body: JSON.stringify(resultado),
      status_code: 200,
      sucesso: resultado.situacao === 'PROCESSADO' || resultado.situacao === 'RECEBIDO',
    });

    return NextResponse.json({
      success: true,
      resultado,
      evento: updated,
      situacao_anterior: evento.status,
    });
  } catch (error) {
    console.error('Erro em POST /api/e-social/eventos/[id]/consultar:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
