import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return processarAlertas(request);
}

export async function POST(request: NextRequest) {
  return processarAlertas(request);
}

async function processarAlertas(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // allow internal cron or continue
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    in30Days.setHours(23, 59, 59, 999);

    const in30DaysStr = in30Days.toISOString().slice(0, 10);

    const { data: asos } = await supabaseAdmin
      .from('gt_documentos')
      .select(`
        id, titulo, numero_documento, numero_rastreio, data_emissao, data_validade, status_validacao,
        colaborador:gt_colaboradores(id, user_id, nome_completo, cpf, email, matricula,
          cargo:gt_cargos(nome),
          empresa:gt_empresas(nome),
          embarcacao_atual:gt_embarcacoes!embarcacao_atual_id(nome)
        )
      `)
      .eq('tipo_documento', 'aso')
      .is('deleted_at', null)
      .lte('data_validade', in30DaysStr)
      .order('data_validade', { ascending: true });

    const listaAsos = (asos || []).filter(a => a.colaborador && a.data_validade);
    const vencidos: any[] = [];
    const vencendo: any[] = [];

    for (const a of listaAsos) {
      const vDate = a.data_validade ? new Date(a.data_validade) : null;
      if (vDate && vDate < today) vencidos.push(a);
      else vencendo.push(a);
    }

    // Criar notificações in-app
    const notificacoesInApp: any[] = [];
    for (const a of listaAsos) {
      const colab = a.colaborador as any;
      if (colab?.user_id) {
        const isVencido = new Date(a.data_validade) < today;
        notificacoesInApp.push({
          user_id: colab.user_id,
          type: 'compliance_alert',
          title: isVencido ? '⚠️ ASO Vencido — Renovação Obrigatória' : '⏰ ASO Próximo do Vencimento',
          message: `Seu ASO com validade até ${a.data_validade} está ${isVencido ? 'VENCIDO' : 'próximo de expirar'}.`,
          priority: isVencido ? 'high' : 'normal',
          action_url: '/department/gestao-tripulantes',
          created_at: new Date().toISOString(),
        });
      }
    }

    const { data: adminUsers } = await supabaseAdmin
      .from('users_unified')
      .select('id')
      .in('role', ['admin', 'manager', 'dp', 'gestor'])
      .limit(20);

    for (const adm of adminUsers || []) {
      notificacoesInApp.push({
        user_id: adm.id,
        type: 'compliance_alert',
        title: `🚨 Alerta DP: ${vencidos.length} ASOs Vencidos e ${vencendo.length} Vencendo`,
        message: `Existem ${vencidos.length} ASO(s) vencido(s) e ${vencendo.length} vencendo nos próximos 30 dias.`,
        priority: vencidos.length > 0 ? 'high' : 'normal',
        action_url: '/department/dp',
        created_at: new Date().toISOString(),
      });
    }

    if (notificacoesInApp.length > 0) {
      await supabaseAdmin.from('notifications').insert(notificacoesInApp);
    }

    return NextResponse.json({
      success: true,
      totalVencidos: vencidos.length,
      totalVencendo: vencendo.length,
      notificacoesCriadas: notificacoesInApp.length
    });
  } catch (error) {
    console.error('Erro no cron de notificação de ASO:', error);
    return NextResponse.json({ error: 'Erro interno no cron' }, { status: 500 });
  }
}
