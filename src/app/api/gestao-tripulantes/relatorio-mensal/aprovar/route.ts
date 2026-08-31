import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email-exchange';
import { gerarRelatorioEscalaMensal } from '@/lib/gestao-tripulantes/relatorio-escala-generator';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader) || request.cookies.get('abzToken')?.value || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const role = (payload.role || '').toUpperCase();
    if (role !== 'ADMIN' && role !== 'ADMINISTRADOR' && role !== 'SUPERADMIN' && role !== 'MANAGER') {
      return NextResponse.json({ error: 'Apenas gestores ou administradores podem aprovar o fechamento mensal da Gestão de Tripulantes.' }, { status: 403 });
    }

    const body = await request.json();
    const { mesAno, observacoes, enviarEmail = true } = body;
    if (!mesAno) {
      return NextResponse.json({ error: 'Mês de referência (mesAno) é obrigatório (formato YYYY-MM)' }, { status: 400 });
    }

    // Buscar dados do usuário aprovador
    const { data: userRecord } = await supabaseAdmin
      .from('users_unified')
      .select('id, name, full_name, email, cpf, signature_url')
      .eq('id', payload.id || payload.userId)
      .maybeSingle();

    const approverName = userRecord?.full_name || userRecord?.name || payload.name || payload.email || 'Gestor Autorizado';
    const approverCpf = userRecord?.cpf || '';
    const approverSignatureUrl = userRecord?.signature_url || '';
    const nowIso = new Date().toISOString();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';

    const hashContent = `GT_FECHAMENTO:${mesAno}:${approverName}:${approverCpf}:${nowIso}:${clientIp}`;
    const signatureHash = crypto.createHash('sha256').update(hashContent).digest('hex');

    // 1. Gerar a planilha Excel oficial com o carimbo de aprovação
    const reportResult = await gerarRelatorioEscalaMensal({
      mesAno,
      aprovador: {
        nome: approverName,
        cpf: approverCpf,
        dataHora: new Date().toLocaleString('pt-BR'),
        ip: clientIp,
        assinaturaUrl: approverSignatureUrl,
        assinaturaHash: signatureHash,
      }
    });

    // 2. Buscar configuração de e-mail do DP
    const { data: configData } = await supabaseAdmin
      .from('gt_configuracoes')
      .select('valor')
      .eq('chave', 'gt_fechamento_mensal_config')
      .maybeSingle();

    const config = configData?.valor ? (typeof configData.valor === 'string' ? JSON.parse(configData.valor) : configData.valor) : {
      emails_destinatarios_dp: ['dp@groupabz.com'],
      emails_cc: [],
      assunto_email_template: 'Fechamento de Escala Gestão de Tripulantes - {Mes_Ano}',
      corpo_email_template: 'Prezados,\n\nSegue em anexo o relatório oficial consolidado de escalas da Gestão de Tripulantes para o período de {Mes_Ano}.\n\nAtenciosamente,\nGestão de Tripulantes - ABZ Group'
    };

    const recipientList = config.emails_destinatarios_dp || ['dp@groupabz.com'];
    const filename = `relatorio_fechamento_escala_${mesAno}.xlsx`;
    let emailSent = false;
    let emailErrorMsg = null;

    if (enviarEmail && recipientList.length > 0) {
      const subject = (config.assunto_email_template || 'Fechamento de Escala Gestão de Tripulantes - {Mes_Ano}')
        .replace(/{Mes_Ano}/g, mesAno);

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 650px;">
          <div style="background-color: #002060; padding: 18px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">ABZ Group — Gestão de Tripulantes</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Relatório Oficial de Fechamento de Escalas — ${mesAno}</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background-color: #ffffff; border-radius: 0 0 8px 8px;">
            <p>Prezados,</p>
            <p>Segue em anexo a planilha oficial consolidada de fechamento de escalas da Gestão de Tripulantes referente a <strong>${mesAno}</strong>.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #002060; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <h4 style="margin: 0 0 8px 0; color: #002060;">Resumo Consolidado do Período:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                <li><strong>Total de Colaboradores:</strong> ${reportResult.totaisConsolidados.totalColaboradores}</li>
                <li><strong>ON (A bordo):</strong> ${reportResult.totaisConsolidados.totalON} períodos/semanas</li>
                <li><strong>DBA (Dobra):</strong> ${reportResult.totaisConsolidados.totalDBA} períodos/semanas</li>
                <li><strong>FI (Folga Indenizada):</strong> ${reportResult.totaisConsolidados.totalFI} períodos/semanas</li>
                <li><strong>TRE (Treinamento Indenizado):</strong> ${reportResult.totaisConsolidados.totalTRE} períodos/semanas</li>
              </ul>
            </div>

            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; border-radius: 6px; margin-top: 20px;">
              <p style="margin: 0; font-size: 13px; color: #065f46;">
                <strong>✓ Aprovado e Assinado Digitalmente por:</strong> ${approverName}<br />
                <strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')} | <strong>IP:</strong> ${clientIp}<br />
                <strong>Código Hash de Autenticidade:</strong> <code style="font-size: 11px;">${signatureHash}</code>
              </p>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              Este é um comunicado automático gerado pelo Sistema Integrado EmployeeHub ABZ Group. O anexo contém a planilha integral em formato XLSX com formatação e fórmulas para importação direta no DP.
            </p>
          </div>
        </div>
      `;

      try {
        await sendEmail(
          recipientList.join(','),
          subject,
          `Relatório de Fechamento de Escalas ${mesAno} aprovado por ${approverName}.`,
          htmlBody,
          {
            attachments: [
              {
                filename,
                content: reportResult.buffer,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              }
            ]
          }
        );
        emailSent = true;
      } catch (err: any) {
        console.error('[API Aprovar SendEmail Error]', err);
        emailErrorMsg = err.message || 'Falha ao despachar e-mail para destinatários';
      }
    }

    // 3. Persistir / Atualizar registro de aprovação
    const [ano, mes] = mesAno.split('-').map(Number);
    const { data: record, error: dbError } = await supabaseAdmin
      .from('gt_relatorios_aprovacoes')
      .upsert({
        mes_referencia: mesAno,
        ano,
        mes,
        status: emailSent ? 'enviado' : 'aprovado',
        dados_totais: reportResult.totaisConsolidados,
        total_colaboradores: reportResult.totaisConsolidados.totalColaboradores,
        total_on: reportResult.totaisConsolidados.totalON,
        total_dba: reportResult.totaisConsolidados.totalDBA,
        total_fi: reportResult.totaisConsolidados.totalFI,
        total_tre: reportResult.totaisConsolidados.totalTRE,
        aprovado_por_id: payload.id || payload.userId,
        aprovado_por_nome: approverName,
        aprovado_por_cpf: approverCpf,
        aprovado_em: nowIso,
        aprovado_ip: clientIp,
        assinatura_url: approverSignatureUrl,
        assinatura_hash: signatureHash,
        emails_enviados: emailSent ? recipientList : [],
        enviado_em: emailSent ? nowIso : null,
        observacoes: observacoes || null,
        arquivo_nome: filename,
        updated_at: nowIso,
      }, { onConflict: 'mes_referencia' })
      .select()
      .single();

    if (dbError) {
      console.error('[API Aprovar Upsert DB Error]', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Relatório do mês ${mesAno} aprovado com sucesso e enviado por e-mail para ${recipientList.join(', ')}!`
        : `Relatório do mês ${mesAno} aprovado com sucesso! (Aviso e-mail: ${emailErrorMsg || 'envio desmarcado'})`,
      registro: record,
      emailSent,
      emailErrorMsg,
      signatureHash,
    });
  } catch (error: any) {
    console.error('[API Aprovar Error]', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar aprovação do fechamento' }, { status: 500 });
  }
}
