import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { consultarProtocolo } from '@/lib/e-social/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const eventosIds = body.eventosIds as string[] | undefined;

    let query = supabaseAdmin
      .from('esocial_eventos')
      .select('*')
      .not('protocolo_envio', 'is', null)
      .order('created_at', { ascending: false });

    if (eventosIds && eventosIds.length > 0) {
      query = query.in('id', eventosIds);
    }

    const { data: eventos, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 });
    }

    const resultados: Array<{
      evento_id: string;
      evento_codigo: string;
      protocolo: string;
      situacao_anterior: string;
      situacao_atual?: string;
      sucesso: boolean;
      erro?: string;
    }> = [];

    for (const evento of eventos || []) {
      try {
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

        await supabaseAdmin.from('esocial_eventos').update(updateData).eq('id', evento.id);

        await supabaseAdmin.from('esocial_envios_log').insert({
          evento_id: evento.id,
          acao: 'consulta',
          request_body: ***REMOVED*** protocolo: evento.protocolo_envio }),
          response_body: JSON.stringify(resultado),
          status_code: 200,
          sucesso: resultado.situacao === 'PROCESSADO' || resultado.situacao === 'RECEBIDO',
        });

        resultados.push({
          evento_id: evento.id,
          evento_codigo: evento.evento_codigo,
          protocolo: evento.protocolo_envio,
          situacao_anterior: evento.status,
          situacao_atual: updateData.status as string | undefined,
          sucesso: true,
        });
      } catch (err) {
        resultados.push({
          evento_id: evento.id,
          evento_codigo: evento.evento_codigo,
          protocolo: evento.protocolo_envio,
          situacao_anterior: evento.status,
          sucesso: false,
          erro: err instanceof Error ? err.message : 'Erro na consulta',
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: resultados.length,
      atualizados: resultados.filter(r => r.situacao_atual !== r.situacao_anterior).length,
      resultados,
    });
  } catch (error) {
    console.error('Erro em POST /api/e-social/consultar-lote:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
