import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { guardDebugRoute } from '@/lib/debug-route-guard';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const blocked = await guardDebugRoute(request);
  if (blocked) return blocked;

  try {
    const { email, phoneNumber, newPassword } = await request.json();

    if ((!email && !phoneNumber) || !newPassword) {
      return NextResponse.json(
        { error: 'Email ou telefone e nova senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin.from('users_unified').select('id, email, phone_number, first_name, last_name');

    if (email) {
      query = query.eq('email', email);
    } else if (phoneNumber) {
      query = query.eq('phone_number', phoneNumber);
    }

    const { data: user, error: userError } = await query.single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabaseAdmin
      .from('users_unified')
      .update({
        password: hashedPassword,
        password_hash: hashedPassword,
        password_last_changed: new Date().toISOString(),
        failed_login_attempts: 0,
        lock_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Senha resetada com sucesso',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone_number,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
      }
    });

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
