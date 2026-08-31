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
    const { mesAno, observacoes, enviarEmail = true, filtros = {} } = body;
    if (!mesAno) {
      return NextResponse.json({ error: 'Mês de referência (mesAno) é obrigatório (formato YYYY-MM)' }, { status: 400 });
    }

    // 1. Buscar dados do usuário aprovador logado
    const userId = payload.id || payload.userId;
    const { data: userRecord } = await supabaseAdmin
      .from('users_unified')
      .select('id, name, full_name, email, cpf, signature_url, role')
      .eq('id', userId)
      .maybeSingle();

    const approverName = userRecord?.full_name || userRecord?.name || payload.name || payload.email || 'Gestor Autorizado';
    const approverEmail = (userRecord?.email || payload.email || '').toLowerCase().trim();
    const approverCpf = userRecord?.cpf || '';
    const approverSignatureUrl = userRecord?.signature_url || '';
    const nowIso = new Date().toISOString();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';

    const hashContent = `GT_FECHAMENTO:${mesAno}:${approverEmail}:${approverCpf}:${nowIso}:${clientIp}`;
    const signatureHash = crypto.createHash('sha256').update(hashContent).digest('hex');

    const currentSignature = {
      userId,
      email: approverEmail,
      nome: approverName,
      cpf: approverCpf,
      cargo: userRecord?.role || payload.role || 'Gestor',
      assinado_em: nowIso,
      dataHora: new Date().toLocaleString('pt-BR'),
      ip: clientIp,
      assinaturaUrl: approverSignatureUrl,
      assinaturaHash: signatureHash,
    };

    // 2. Buscar configuração de aprovadores obrigatórios e de e-mail
    const { data: configData } = await supabaseAdmin
      .from('gt_configuracoes')
      .select('valor')
      .eq('chave', 'gt_fechamento_mensal_config')
      .maybeSingle();

    const config = configData?.valor ? (typeof configData.valor === 'string' ? JSON.parse(configData.valor) : configData.valor) : {
      emails_destinatarios_dp: ['dp@groupabz.com'],
      emails_cc: [],
      aprovadores_obrigatorios: [],
      assunto_email_template: 'Fechamento de Escala Gestão de Tripulantes - {Mes_Ano}',
      corpo_email_template: 'Prezados,\n\nSegue em anexo o relatório oficial consolidado de escalas da Gestão de Tripulantes para o período de {Mes_Ano}.\n\nAtenciosamente,\nGestão de Tripulantes - ABZ Group'
    };

    const aprovadoresObrigatorios: Array<{ id?: string; email: string; nome: string; cargo?: string }> = Array.isArray(config.aprovadores_obrigatorios)
      ? config.aprovadores_obrigatorios
      : [];

    // 3. Buscar registro existente para mesAno
    const { data: registroExistente } = await supabaseAdmin
      .from('gt_relatorios_aprovacoes')
      .select('*')
      .eq('mes_referencia', mesAno)
      .maybeSingle();

    const assinaturasMap = new Map<string, typeof currentSignature>();

    // Carregar assinaturas já coletadas
    if (Array.isArray(registroExistente?.assinaturas)) {
      for (const sig of registroExistente.assinaturas) {
        if (sig.email) assinaturasMap.set(sig.email.toLowerCase(), sig);
        else if (sig.userId) assinaturasMap.set(sig.userId, sig);
      }
    }

    // Inserir / Atualizar assinatura do usuário atual
    assinaturasMap.set(approverEmail, currentSignature);
    const assinaturasArray = Array.from(assinaturasMap.values());

    // 4. Verificar se todos os aprovadores obrigatórios assinaram
    let todosAssinaram = true;
    const pendentes: typeof aprovadoresObrigatorios = [];

    if (aprovadoresObrigatorios.length > 0) {
      for (const obr of aprovadoresObrigatorios) {
        const obrEmail = (obr.email || '').toLowerCase().trim();
        const obrId = obr.id;
        const assinou = assinaturasArray.some(s => 
          (obrEmail && s.email && s.email.toLowerCase() === obrEmail) ||
          (obrId && s.userId && s.userId === obrId)
        );
        if (!assinou) {
          todosAssinaram = false;
          pendentes.push(obr);
        }
      }
    }

    // 5. Gerar planilha oficial com a lista de chancelas digitais coletadas
    const reportResult = await gerarRelatorioEscalaMensal({
      mesAno,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      empresa: filtros.empresa,
      embarcacao: filtros.embarcacao,
      cargo: filtros.cargo,
      statusAtivo: filtros.statusAtivo,
      busca: filtros.busca,
      aprovadores: assinaturasArray,
    });

    const recipientList = config.emails_destinatarios_dp || ['dp@groupabz.com'];
    const safeEmb = (filtros.embarcacao || 'Todas').replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
    const filename = `relatorio_fechamento_${mesAno}_${safeEmb}.xlsx`;
    let emailSent = false;
    let emailErrorMsg = null;

    // Se TODOS os aprovadores obrigatórios assinaram e o envio está habilitado: despachar e-mail ao DP
    if (todosAssinaram && enviarEmail && recipientList.length > 0) {
      const subject = (config.assunto_email_template || 'Fechamento de Escala Gestão de Tripulantes - {Mes_Ano}')
        .replace(/{Mes_Ano}/g, mesAno);

      const chancelasHtml = assinaturasArray.map(s => `
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 8px 12px; border-radius: 6px; margin-top: 8px;">
          <p style="margin: 0; font-size: 12px; color: #065f46;">
            <strong>✓ Assinado por:</strong> ${s.nome} (${s.cargo || 'Gestor'})<br />
            <strong>Data/Hora:</strong> ${s.dataHora} | <strong>IP:</strong> ${s.ip}<br />
            <strong>Hash de Integridade:</strong> <code style="font-size: 11px;">${s.assinaturaHash}</code>
          </p>
        </div>
      `).join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 680px;">
          <div style="background-color: #002060; padding: 18px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">ABZ Group — Gestão de Tripulantes</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Relatório Oficial de Fechamento de Escalas — ${mesAno}</p>
          </div>
          <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background-color: #ffffff; border-radius: 0 0 8px 8px;">
            <p>Prezados,</p>
            <p>Segue em anexo a planilha oficial consolidada de fechamento de escalas da Gestão de Tripulantes referente ao período de <strong>${mesAno}</strong>.</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #002060; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <h4 style="margin: 0 0 8px 0; color: #002060;">Resumo Consolidado:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                <li><strong>Total de Colaboradores:</strong> ${reportResult.totaisConsolidados.totalColaboradores}</li>
                <li><strong>ON (A bordo):</strong> ${reportResult.totaisConsolidados.totalON} períodos/semanas</li>
                <li><strong>DBA (Dobra):</strong> ${reportResult.totaisConsolidados.totalDBA} períodos/semanas</li>
                <li><strong>FI (Folga Indenizada):</strong> ${reportResult.totaisConsolidados.totalFI} períodos/semanas</li>
                <li><strong>TRE (Treinamento Indenizado):</strong> ${reportResult.totaisConsolidados.totalTRE} períodos/semanas</li>
              </ul>
            </div>

            <h4 style="margin: 16px 0 4px 0; color: #002060;">Aprovações e Assinaturas Digitais Registradas:</h4>
            ${chancelasHtml}

            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              Este documento foi gerado e aprovado com validação de chaves criptográficas no sistema corporativo EmployeeHub ABZ Group.
            </p>
          </div>
        </div>
      `;

      try {
        await sendEmail(
          recipientList.join(','),
          subject,
          `Relatório de Fechamento de Escalas ${mesAno} aprovado.`,
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

    // 6. Persistir no banco de dados com status apropriado
    const [ano, mes] = mesAno.split('-').map(Number);
    const finalStatus = todosAssinaram
      ? (emailSent ? 'enviado' : 'aprovado')
      : 'em_aprovacao';

    const { data: record, error: dbError } = await supabaseAdmin
      .from('gt_relatorios_aprovacoes')
      .upsert({
        mes_referencia: mesAno,
        ano,
        mes,
        status: finalStatus,
        dados_totais: reportResult.totaisConsolidados,
        total_colaboradores: reportResult.totaisConsolidados.totalColaboradores,
        total_on: reportResult.totaisConsolidados.totalON,
        total_dba: reportResult.totaisConsolidados.totalDBA,
        total_fi: reportResult.totaisConsolidados.totalFI,
        total_tre: reportResult.totaisConsolidados.totalTRE,
        aprovadores_obrigatorios: aprovadoresObrigatorios,
        assinaturas: assinaturasArray,
        aprovado_por_id: userId,
        aprovado_por_nome: approverName,
        aprovado_por_cpf: approverCpf,
        aprovado_em: nowIso,
        aprovado_ip: clientIp,
        assinatura_url: approverSignatureUrl,
        assinatura_hash: signatureHash,
        emails_enviados: emailSent ? recipientList : (registroExistente?.emails_enviados || []),
        enviado_em: emailSent ? nowIso : (registroExistente?.enviado_em || null),
        observacoes: observacoes || registroExistente?.observacoes || null,
        arquivo_nome: filename,
        updated_at: nowIso,
      }, { onConflict: 'mes_referencia' })
      .select()
      .single();

    if (dbError) {
      console.error('[API Aprovar Upsert DB Error]', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    let message = '';
    if (todosAssinaram) {
      message = emailSent
        ? `Fechamento de ${mesAno} aprovado por todos os integrantes e enviado com sucesso ao DP (${recipientList.join(', ')})!`
        : `Fechamento de ${mesAno} aprovado por todos os integrantes!`;
    } else {
      const nomesPendentes = pendentes.map(p => p.nome).join(', ');
      message = `Sua assinatura foi registrada com sucesso! Aguardando a assinatura de: ${nomesPendentes} para o envio final ao DP.`;
    }

    return NextResponse.json({
      success: true,
      message,
      status: finalStatus,
      registro: record,
      todosAssinaram,
      pendentes,
      assinaturas: assinaturasArray,
      emailSent,
      emailErrorMsg,
      signatureHash,
    });
  } catch (error: any) {
    console.error('[API Aprovar Error]', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar aprovação do fechamento' }, { status: 500 });
  }
}
