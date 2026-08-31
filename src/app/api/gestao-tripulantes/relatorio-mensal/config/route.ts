import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { data, error } = await supabaseAdmin
      .from('gt_configuracoes')
      .select('*')
      .eq('chave', 'gt_fechamento_mensal_config')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[API Config GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const defaultConfig = {
      dia_fechamento_mes: 25,
      emails_destinatarios_dp: ['dp@groupabz.com'],
      emails_cc: [],
      aprovadores_obrigatorios: [],
      envio_automatico: false,
      assunto_email_template: 'Fechamento de Escala Gestão de Tripulantes - {Mes_Ano}',
      corpo_email_template: 'Prezados,\n\nSegue em anexo o relatório oficial consolidado de escalas da Gestão de Tripulantes para o período de {Mes_Ano}.\n\nO documento inclui o cômputo individual e total de dias/semanas para:\n- ON (A bordo)\n- DBA (Dobra)\n- FI (Folga Indenizada)\n- TRE (Treinamento Indenizado)\n\nRelatório aprovado digitalmente pelo responsável da operação.\n\nAtenciosamente,\nGestão de Tripulantes - ABZ Group'
    };

    // Buscar lista de usuários com permissão de gestão/admin para seleção
    const { data: managers } = await supabaseAdmin
      .from('users_unified')
      .select('id, name, full_name, email, role, cpf')
      .in('role', ['admin', 'ADMIN', 'administrador', 'ADMINISTRADOR', 'superadmin', 'SUPERADMIN', 'manager', 'MANAGER'])
      .order('name');

    return NextResponse.json({
      success: true,
      config: data ? (typeof data.valor === 'string' ? JSON.parse(data.valor) : data.valor) : defaultConfig,
      availableManagers: managers || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar configuração' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
      return NextResponse.json({ error: 'Permissão negada. Apenas administradores e gestores podem alterar configurações de fechamento.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      dia_fechamento_mes,
      emails_destinatarios_dp,
      emails_cc,
      aprovadores_obrigatorios,
      envio_automatico,
      assunto_email_template,
      corpo_email_template
    } = body;

    const valorConfig = {
      dia_fechamento_mes: Math.min(31, Math.max(1, parseInt(dia_fechamento_mes, 10) || 25)),
      emails_destinatarios_dp: Array.isArray(emails_destinatarios_dp) ? emails_destinatarios_dp : [emails_destinatarios_dp].filter(Boolean),
      emails_cc: Array.isArray(emails_cc) ? emails_cc : [],
      aprovadores_obrigatorios: Array.isArray(aprovadores_obrigatorios) ? aprovadores_obrigatorios : [],
      envio_automatico: Boolean(envio_automatico),
      assunto_email_template: assunto_email_template || 'Fechamento de Escala Gestão de Tripulantes - {Mes_Ano}',
      corpo_email_template: corpo_email_template || 'Prezados,\n\nSegue em anexo o relatório oficial consolidado de escalas.',
    };

    const { data: existing } = await supabaseAdmin
      .from('gt_configuracoes')
      .select('id')
      .eq('chave', 'gt_fechamento_mensal_config')
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from('gt_configuracoes')
        .update({
          valor: valorConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabaseAdmin
        .from('gt_configuracoes')
        .insert({
          chave: 'gt_fechamento_mensal_config',
          valor: valorConfig,
          descricao: 'Configuração do workflow de fechamento mensal, aprovadores obrigatórios e envio para o DP',
          updated_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, config: valorConfig });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}
