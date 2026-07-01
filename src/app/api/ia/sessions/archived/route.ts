/**
 * API: /api/ia/sessions/archived
 * GET  — Listar sessões arquivadas (inativas) do usuário
 * POST — Restaurar uma sessão arquivada (body: { session_id })
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tokenResult = verifyRequestToken(request);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = tokenResult.payload.userId;

    const { data, error } = await supabaseAdmin
      .from('ia_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data || [] });
  } catch (err) {
    console.error('[API IA Sessions Archived GET]', err);
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
    const sessionId = body.session_id;

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id é obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('ia_chat_sessions')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Sessão arquivada não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Sessão restaurada', session: data });
  } catch (err) {
    console.error('[API IA Sessions Archived POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
