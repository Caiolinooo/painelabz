import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { sendVerificationEmail } from '@/lib/email';
import { sendNewUserWelcomeEmail, sendAdminNotificationEmail } from '@/lib/notifications';

// Inicializar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para gerar número de protocolo
function generateProtocolNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REG-${year}${month}${day}-${random}`;
}

// Função para gerar código de verificação
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      phoneNumber,
      firstName,
      lastName,
      position,
      department
    } = body;

    // Validar os dados de entrada
    if (!email || !phoneNumber || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe
    const { data: existingUserByEmail, error: emailError } = await supabase
      .from('users_unified')
      .select('*')
      .eq('email', email)
      .single();

    const { data: existingUserByPhone, error: phoneError } = await supabase
      .from('users_unified')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (existingUserByEmail || existingUserByPhone) {
      return NextResponse.json(
        { error: 'Usuário já cadastrado com este e-mail ou telefone' },
        { status: 400 }
      );
    }

    // Gerar código de verificação
    const verificationCode = generateVerificationCode();

    // Calcular data de expiração (15 minutos por padrão)
    const expiryMinutes = parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '15');
    const verificationCodeExpires = new Date();
    verificationCodeExpires.setMinutes(verificationCodeExpires.getMinutes() + expiryMinutes);

    // Gerar número de protocolo
    const protocol = generateProtocolNumber();

    // Gerar senha temporária
    const temporaryPassword = uuidv4().substring(0, 8);

    // Criar usuário na autenticação do Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: temporaryPassword,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          role: 'USER'
        }
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário na autenticação:', authError);
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Criar usuário na tabela users_unified
    const { data: userData, error: userError } = await supabase
      .from('users_unified')
      .insert({
        id: authData.user.id,
        email,
        phone_number: phoneNumber,
        first_name: firstName,
        last_name: lastName,
        position: position || 'Não informado',
        department: department || 'Não informado',
        role: 'USER',
        active: false, // Inativo até ser aprovado
        verification_code: verificationCode,
        verification_code_expires: verificationCodeExpires.toISOString(),
        protocol: protocol,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('Erro ao criar usuário na tabela users_unified:', userError);
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Adicionar permissões padrão
    const defaultModules = [
      'dashboard',
      'manual',
      'procedimentos',
      'politicas',
      'calendario',
      'noticias',
      'reembolso',
      'contracheque',
      'ponto'
    ];

    const permissionsToInsert = defaultModules.map(module => ({
      user_id: authData.user.id,
      module,
      feature: null
    }));

    const { data: permissionsData, error: permissionsError } = await supabase
      .from('user_permissions')
      .insert(permissionsToInsert);

    if (permissionsError) {
      console.error('Erro ao adicionar permissões:', permissionsError);
      // Não interromper o fluxo se as permissões falharem
    }

    // Registrar histórico de acesso
    const { data: historyData, error: historyError } = await supabase
      .from('access_history')
      .insert({
        user_id: authData.user.id,
        action: 'REGISTERED',
        details: `Usuário registrado via formulário. Protocolo: ${protocol}`,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    if (historyError) {
      console.error('Erro ao registrar histórico de acesso:', historyError);
      // Não interromper o fluxo se o histórico falhar
    }

    // Enviar código de verificação por e-mail
    const sendResult = await sendVerificationEmail(email, verificationCode);

    // Enviar e-mail de confirmação para o usuário
    try {
      console.log(`Enviando email de confirmação para ${email}`);
      const emailResult = await sendNewUserWelcomeEmail(email, firstName);
      console.log(`Resultado do envio de email: ${emailResult.success ? 'Sucesso' : 'Falha'}`);
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não interromper o fluxo se o email falhar
    }

    // Enviar notificação para o administrador
    try {
      await sendAdminNotificationEmail(
        process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com',
        {
          name: `${firstName} ${lastName}`,
          email,
          phoneNumber,
          position: position || 'Não informado',
          department: department || 'Não informado',
          protocol
        }
      );
    } catch (notifyError) {
      console.error('Erro ao enviar notificação para o administrador:', notifyError);
      // Não interromper o fluxo se a notificação falhar
    }

    return NextResponse.json({
      success: true,
      message: 'Registro realizado com sucesso. Verifique seu e-mail para confirmar seu cadastro.',
      protocol,
      previewUrl: sendResult.previewUrl
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
