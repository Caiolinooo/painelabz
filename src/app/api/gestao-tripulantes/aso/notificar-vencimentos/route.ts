import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email-service';

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    in30Days.setHours(23, 59, 59, 999);

    const todayStr = today.toISOString().slice(0, 10);
    const in30DaysStr = in30Days.toISOString().slice(0, 10);

    // Buscar ASOs vencidos ou vencendo nos próximos 30 dias
    const { data: asos, error: asoErr } = await supabaseAdmin
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

    if (asoErr) {
      console.error('Erro ao buscar ASOs para notificação:', asoErr);
      return NextResponse.json({ error: 'Falha ao buscar registros de ASO' }, { status: 500 });
    }

    const listaAsos = (asos || []).filter(a => a.colaborador && a.data_validade);
    if (listaAsos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum ASO vencido ou vencendo nos próximos 30 dias.',
        totalNotificados: 0,
      });
    }

    // Separar em Vencidos e A Vencer
    const vencidos: any[] = [];
    const vencendo: any[] = [];

    for (const a of listaAsos) {
      const vDate = a.data_validade ? new Date(a.data_validade) : null;
      if (vDate && vDate < today) {
        vencidos.push(a);
      } else {
        vencendo.push(a);
      }
    }

    // 1. Criar Notificações no Portal para os Colaboradores e Admins
    const notificacoesInApp: any[] = [];

    // Notificar cada colaborador individualmente (se tiver user_id)
    for (const a of listaAsos) {
      const colab = a.colaborador as any;
      if (colab?.user_id) {
        const isVencido = new Date(a.data_validade) < today;
        notificacoesInApp.push({
          user_id: colab.user_id,
          type: 'compliance_alert',
          title: isVencido ? '⚠️ ASO Vencido — Renovação Obrigatória' : '⏰ ASO Próximo do Vencimento',
          message: `Seu ASO com validade até ${a.data_validade} está ${isVencido ? 'VENCIDO' : 'próximo de expirar'}. Procure o DP imediatamente para agendamento.`,
          priority: isVencido ? 'high' : 'normal',
          action_url: '/department/gestao-tripulantes',
          created_at: new Date().toISOString(),
        });
      }
    }

    // Notificar gestores/admins com resumo
    const { data: adminUsers } = await supabaseAdmin
      .from('users_unified')
      .select('id, email, full_name, role')
      .in('role', ['admin', 'manager', 'dp', 'gestor'])
      .limit(20);

    for (const adm of adminUsers || []) {
      notificacoesInApp.push({
        user_id: adm.id,
        type: 'compliance_alert',
        title: `🚨 Alerta DP: ${vencidos.length} ASOs Vencidos e ${vencendo.length} Vencendo`,
        message: `Existem ${vencidos.length} ASO(s) vencido(s) e ${vencendo.length} vencendo nos próximos 30 dias na frota.`,
        priority: vencidos.length > 0 ? 'high' : 'normal',
        action_url: '/department/dp',
        created_at: new Date().toISOString(),
      });
    }

    if (notificacoesInApp.length > 0) {
      await supabaseAdmin.from('notifications').insert(notificacoesInApp);
    }

    // 2. Disparar E-mail Consolidado para o DP
    const { data: configWorkflow } = await supabaseAdmin
      .from('gt_configuracoes')
      .select('valor')
      .eq('chave', 'workflow_fechamento_config')
      .maybeSingle();

    const cfg = configWorkflow?.valor || {};
    const dpEmails: string[] = [];
    if (cfg.email_departamento_pessoal) {
      dpEmails.push(cfg.email_departamento_pessoal);
    }
    for (const apr of cfg.aprovadores_obrigatorios || []) {
      if (apr.email && !dpEmails.includes(apr.email)) {
        dpEmails.push(apr.email);
      }
    }

    if (dpEmails.length === 0) {
      dpEmails.push('dp@groupabz.com');
    }

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: #002060; padding: 20px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Relatório de Vencimentos de ASO — Departamento Pessoal</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Monitoramento e Alerta Automático de Conformidade Ocupacional</p>
        </div>

        <div style="padding: 24px;">
          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px 16px; border-radius: 8px; flex: 1;">
              <span style="font-size: 11px; color: #991b1b; font-weight: bold; text-transform: uppercase;">ASOs Vencidos</span>
              <div style="font-size: 22px; font-weight: 900; color: #7f1d1d;">${vencidos.length}</div>
            </div>
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px; flex: 1;">
              <span style="font-size: 11px; color: #92400e; font-weight: bold; text-transform: uppercase;">Vencendo em até 30 dias</span>
              <div style="font-size: 22px; font-weight: 900; color: #78350f;">${vencendo.length}</div>
            </div>
          </div>

          <h3 style="font-size: 14px; color: #002060; margin: 16px 0 8px 0; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">
            Lista de Colaboradores com ASO Pendente de Renovação
          </h3>

          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px;">
            <thead>
              <tr style="background: #f8fafc; color: #475569; text-align: left;">
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Colaborador</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">CPF / Matrícula</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Cargo / Embarcação</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Validade</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${listaAsos.map(a => {
                const c = a.colaborador as any;
                const isV = new Date(a.data_validade) < today;
                return `
                  <tr style="border-bottom: 1px solid #f1f5f9; ${isV ? 'background: #fff5f5;' : ''}">
                    <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${c?.nome_completo || 'N/A'}</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${c?.cpf || '—'} <br/><span style="color: #64748b; font-size: 10px;">Matrícula: ${c?.matricula || '—'}</span></td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${c?.cargo?.nome || '—'}<br/><span style="color: #002060; font-weight: 600; font-size: 10px;">${c?.embarcacao_atual?.nome || '—'}</span></td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: ${isV ? '#dc2626' : '#d97706'}; font-family: monospace;">${a.data_validade}</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: bold; background: ${isV ? '#fee2e2; color: #991b1b;' : '#fef3c7; color: #92400e;'}">
                        ${isV ? 'VENCIDO' : 'VENCENDO'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 11px; color: #64748b; text-align: center;">
            Este é um comunicado automático gerado pelo Sistema de Gestão de Tripulantes & Departamento Pessoal ABZ Group.
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail(
        dpEmails,
        `⚠️ [Alerta DP] ${vencidos.length} ASOs Vencidos / ${vencendo.length} Vencendo nos próximos 30 dias`,
        `Alerta de Vencimento de ASO: ${vencidos.length} vencidos e ${vencendo.length} vencendo nos próximos 30 dias. Acesse o portal para verificar.`,
        emailHtml
      );
    } catch (e) {
      console.warn('Erro ao enviar e-mail de alerta de ASO para DP:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Alertas processados: ${vencidos.length} vencidos e ${vencendo.length} a vencer. E-mails e notificações in-app disparados.`,
      data: {
        totalVencidos: vencidos.length,
        totalVencendo: vencendo.length,
        destinatariosEmail: dpEmails,
        totalNotificacoesInApp: notificacoesInApp.length,
      }
    });
  } catch (error) {
    console.error('Erro na rota de notificação de ASO:', error);
    return NextResponse.json({ error: 'Erro interno ao processar notificações' }, { status: 500 });
  }
}
