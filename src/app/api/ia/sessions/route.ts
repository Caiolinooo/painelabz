/**
 * API: /api/ia/sessions
 * GET    — Listar sessões do usuário autenticado (exclui inativas > 30 dias)
 * POST   — Criar nova sessão
 * DELETE — Soft-delete de sessão (via query param ?id=)
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const INACTIVE_THRESHOLD_DAYS = 30;

async function cleanupInactiveSessions(userId: string): Promise<number> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - INACTIVE_THRESHOLD_DAYS);
  const thresholdISO = threshold.toISOString();

  const { data: oldSessions, error: fetchError } = await supabaseAdmin
    .from('ia_chat_sessions')
    .select('id')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .lt('updated_at', thresholdISO)
    .limit(100);

  if (fetchError || !oldSessions || oldSessions.length === 0) return 0;

  const ids = oldSessions.map(s => s.id);
  const { error: updateError } = await supabaseAdmin
    .from('ia_chat_sessions')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);

  if (updateError) {
    console.warn('[IA Sessions Cleanup] Erro ao atualizar sessões inativas:', updateError.message);
    return 0;
  }

  console.log(`[IA Sessions Cleanup] ${ids.length} sessão(ões) inativa(s) marcada(s) como fechada(s) para usuário ${userId}.`);
  return ids.length;
}

export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;

    await cleanupInactiveSessions(userId);

    const { data, error } = await supabaseAdmin
      .from('ia_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (err) {
    console.error('[API IA Sessions GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const body = await request.json().catch(() => ({}));
    const title = body.title?.trim() || 'Nova conversa';

    const { data, error } = await supabaseAdmin
      .from('ia_chat_sessions')
      .insert({
        user_id: userId,
        session_title: title,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session: data }, { status: 201 });
  } catch (err) {
    console.error('[API IA Sessions POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;
    const sessionId = request.nextUrl.searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'ID da sessão é obrigatório' }, { status: 400 });
    }

    // Soft delete — verificar que a sessão pertence ao usuário
    const { data, error } = await supabaseAdmin
      .from('ia_chat_sessions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Sessão excluída', session: data });
  } catch (err) {
    console.error('[API IA Sessions DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
