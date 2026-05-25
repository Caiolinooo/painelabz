import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    const { colaborador_id, tipo, titulo, mensagem, canal, destinatario_id, todos_standby } = body;

    if (!tipo || !titulo || !mensagem || !canal) {
      return NextResponse.json({ error: 'tipo, titulo, mensagem e canal são obrigatórios' }, { status: 400 });
    }

    const canaisValidos = ['inapp', 'email', 'push'];
    if (!canaisValidos.includes(canal)) {
      return NextResponse.json({ error: `Canal inválido. Use: ${canaisValidos.join(', ')}` }, { status: 400 });
    }

    const destinatarios: { id: string; colaborador_id: string }[] = [];

    if (todos_standby) {
      const { data: standbyUsers, error: standbyErr } = await supabaseAdmin
        .from('gt_colaboradores')
        .select('id, user_id')
        .eq('standby', true)
        .is('deleted_at', null);

      if (standbyErr) {
        return NextResponse.json({ error: 'Erro ao buscar tripulantes em standby' }, { status: 500 });
      }

      for (const u of standbyUsers || []) {
        destinatarios.push({ id: u.user_id || u.id, colaborador_id: u.id });
      }
    } else if (destinatario_id) {
      destinatarios.push({ id: destinatario_id, colaborador_id: colaborador_id || destinatario_id });
    } else if (colaborador_id) {
      const { data: colab } = await supabaseAdmin
        .from('gt_colaboradores')
        .select('id, user_id')
        .eq('id', colaborador_id)
        .maybeSingle();

      if (!colab) {
        return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
      }
      destinatarios.push({ id: colab.user_id || colab.id, colaborador_id: colab.id });
    } else {
      return NextResponse.json({ error: 'Informe colaborador_id, destinatario_id ou todos_standby' }, { status: 400 });
    }

    const logs: any[] = [];

    for (const dest of destinatarios) {
      const { error: logErr } = await supabaseAdmin
        .from('gt_notificacoes_log')
        .insert({
          colaborador_id: dest.colaborador_id,
          tipo_notificacao: tipo,
          canal,
          titulo,
          mensagem,
          destinatario_id: dest.id,
          data_envio: new Date().toISOString(),
          sucesso: true,
        });

      if (logErr) {
        console.error('Erro ao registrar notificação:', logErr);
        logs.push({ destinatario: dest.id, erro: logErr.message });
      } else {
        logs.push({ destinatario: dest.id, sucesso: true });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${logs.filter(l => l.sucesso).length} notificação(ões) enviada(s)`,
      data: { total: destinatarios.length, logs }
    });
  } catch (error) {
    console.error('Erro na API notificar:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
