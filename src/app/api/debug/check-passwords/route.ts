import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { guardDebugRoute } from '@/lib/debug-route-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const blocked = await guardDebugRoute(request);
  if (blocked) return blocked;

  try {
    const { data: users, error } = await supabaseAdmin
      .from('users_unified')
      .select('id, email, phone_number, first_name, last_name, password, password_hash, email_verified, active')
      .order('email');

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'Nenhum usuário encontrado', users: [] });
    }

    const isBcrypt = (value: string) =>
      value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');

    const result = users.map(user => {
      const hasPassword = !!user.password;
      const hasPasswordHash = !!user.password_hash;

      return {
        id: user.id,
        email: user.email || 'N/A',
        phone: user.phone_number || 'N/A',
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A',
        password: {
          exists: hasPassword,
          status: hasPassword ? (isBcrypt(user.password) ? 'bcrypt' : 'plaintext') : 'none',
        },
        passwordHash: {
          exists: hasPasswordHash,
          status: hasPasswordHash ? (isBcrypt(user.password_hash) ? 'bcrypt' : 'plaintext') : 'none',
        },
        emailVerified: user.email_verified,
        active: user.active
      };
    });

    const stats = {
      total: users.length,
      withPassword: users.filter(u => u.password).length,
      withPasswordHash: users.filter(u => u.password_hash).length,
      withBcryptPassword: users.filter(u => u.password && isBcrypt(u.password)).length,
      withPlaintextPassword: users.filter(u => u.password && !isBcrypt(u.password)).length,
      noPassword: users.filter(u => !u.password && !u.password_hash).length
    };

    return NextResponse.json({
      success: true,
      message: `Encontrados ${users.length} usuários`,
      users: result,
      stats
    });

  } catch (error) {
    console.error('Erro durante a verificação:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
