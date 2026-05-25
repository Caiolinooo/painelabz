import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(
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

    if (body.aprovado === undefined || body.aprovado === null) {
      return NextResponse.json({ error: 'aprovado (boolean) é obrigatório' }, { status: 400 });
    }

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

    if (evento.status !== 'pendente_revisao' && evento.status !== 'revisao_rejeitado' && evento.status !== 'erro') {
      return NextResponse.json({
        error: `Evento no status "${evento.status}" não pode ser revisado. Status esperado: "pendente_revisao", "revisao_rejeitado" ou "erro"`,
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Clear error state and protocol when retrying/re-approving
    const erroReset: any = {};
    if (evento.status === 'erro' || evento.status === 'pendente_revisao' || evento.status === 'revisao_rejeitado') {
      erroReset.ultimo_erro = null;
      erroReset.erros_processamento = null;
      erroReset.tentativas_envio = 0;
      erroReset.protocolo_envio = null;
      erroReset.numero_recibo = null;
    }

    if (body.aprovado) {
      const { data: config } = await supabaseAdmin
        .from('esocial_configuracoes')
        .select('valor')
        .eq('chave', 'autonomia_envio')
        .maybeSingle();

      const autonomiaEnvio = config?.valor === 'true';

      const updateData: any = {
        status: 'revisao_aprovado',
        revisado_por: payload.userId,
        revisado_em: now,
        updated_at: now,
        ...erroReset,
      };

      if (autonomiaEnvio) {
        updateData.status = 'fila_envio';
      }

      if (body.comentario) {
        const comentario_revisao = evento.comentario_revisao || '';
        const comentario = `[Revisão - ${now}] ${body.comentario}`;
        updateData.comentario_revisao = comentario_revisao ? `${comentario_revisao}\n${comentario}` : comentario;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('esocial_eventos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao aprovar revisão:', updateError);
        return NextResponse.json({ error: 'Erro ao aprovar revisão' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: autonomiaEnvio
          ? 'Revisão aprovada. Evento enviado automaticamente para a fila de envio.'
          : 'Revisão aprovada. Evento aguardando autorização para envio.',
        evento: updated,
      });
    } else {
      const updateData: any = {
        status: 'revisao_rejeitado',
        revisado_por: payload.userId,
        revisado_em: now,
        updated_at: now,
        ...erroReset,
      };

      if (body.comentario) {
        const comentario_revisao = evento.comentario_revisao || '';
        const comentario = `[Rejeição - ${now}] ${body.comentario}`;
        updateData.comentario_revisao = comentario_revisao ? `${comentario_revisao}\n${comentario}` : comentario;
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('esocial_eventos')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao rejeitar revisão:', updateError);
        return NextResponse.json({ error: 'Erro ao rejeitar revisão' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Revisão rejeitada. O evento retornará para ajustes.',
        evento: updated,
      });
    }
  } catch (error) {
    console.error('Erro em PUT /api/e-social/eventos/[id]/revisar:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
