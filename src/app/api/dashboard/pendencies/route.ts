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

    const userId = tokenResult.payload.userId || tokenResult.payload.sub;

    const result = {
      emails_nao_lidos: 0,
      ferias_pendentes: 0,
      reembolsos_pendentes: 0,
      avaliacoes_pendentes: 0,
      epis_vencidos: 0,
      eventos_hoje_amanha: 0,
      total: 0,
    };

    const queries: Promise<void>[] = [];

    queries.push(
      (async () => {
        try {
          const { count } = await supabaseAdmin
            .from('leave_requests')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['PENDING_LEADER', 'PENDING_MANAGER', 'PENDING']);
          result.ferias_pendentes = count || 0;
        } catch {}
      })(),
      (async () => {
        try {
          const { data: user } = await supabaseAdmin
            .from('users_unified')
            .select('email')
            .eq('id', userId)
            .single();
          if (user?.email) {
            const { count } = await supabaseAdmin
              .from('Reimbursement')
              .select('*', { count: 'exact', head: true })
              .eq('email', user.email)
              .eq('status', 'pendente');
            result.reembolsos_pendentes = count || 0;
          }
        } catch {}
      })(),
      (async () => {
        try {
          const { count } = await supabaseAdmin
            .from('avaliacoes_desempenho')
            .select('*', { count: 'exact', head: true })
            .eq('colaborador_id', userId)
            .in('status', ['pending', 'em_andamento', 'pendente', 'pendente_autoavaliacao']);
          result.avaliacoes_pendentes = count || 0;
        } catch {}
      })(),
      (async () => {
        try {
          const { count } = await supabaseAdmin
            .from('epi_records')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['expired', 'vencido']);
          result.epis_vencidos = count || 0;
        } catch {}
      })(),
      (async () => {
        try {
          const hoje = new Date().toISOString().split('T')[0];
          const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          const { count } = await supabaseAdmin
            .from('calendar_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('start_time', `${hoje}T00:00:00`)
            .lte('start_time', `${amanha}T23:59:59`);
          result.eventos_hoje_amanha = count || 0;
        } catch {}
      })(),
      (async () => {
        try {
          const { data: user } = await supabaseAdmin
            .from('users_unified')
            .select('email')
            .eq('id', userId)
            .single();
          if (user?.email) {
            const { msGraphClient } = await import('@/lib/ia/microsoft/client');
            const emails = await msGraphClient.listEmails(user.email, 10);
            result.emails_nao_lidos = emails.filter((e: any) => !e.isRead).length;
          }
        } catch {}
      })(),
    );

    await Promise.allSettled(queries);

    result.total =
      result.emails_nao_lidos +
      result.ferias_pendentes +
      result.reembolsos_pendentes +
      result.avaliacoes_pendentes +
      result.epis_vencidos +
      result.eventos_hoje_amanha;

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API Dashboard Pendencias]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}