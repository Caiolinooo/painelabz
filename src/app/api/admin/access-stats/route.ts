import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// Criar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/access-stats
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário é administrador
    const { data: requestingUser, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', payload.userId)
      .single();

    if (userError || !requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta API.' },
        { status: 403 }
      );
    }

    // Calcular estatísticas
    const stats = await calculateAccessStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Calcula estatísticas de acesso ao sistema usando Supabase
 * @returns Objeto com estatísticas
 */
async function calculateAccessStats() {
  // Calcular data de 30 dias atrás
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  // Calcular data de 7 dias atrás
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString();

  // Estatísticas de usuários
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, role, active, created_at, department, position, last_login');

  if (usersError) {
    console.error('Erro ao buscar usuários:', usersError);
    throw new Error('Erro ao buscar estatísticas de usuários');
  }

  // Estatísticas de autorizações
  const { data: authData, error: authError } = await supabase
    .from('authorized_users')
    .select('id, email, phone_number, domain, invite_code, status');

  if (authError) {
    console.error('Erro ao buscar autorizações:', authError);
    throw new Error('Erro ao buscar estatísticas de autorizações');
  }

  // Processar estatísticas de usuários
  const totalUsers = usersData.length;
  const activeUsers = usersData.filter(user => user.active).length;
  const newUsers = usersData.filter(user => new Date(user.created_at) >= thirtyDaysAgo).length;
  const recentlyActiveUsers = usersData.filter(user => user.last_login && new Date(user.last_login) >= sevenDaysAgo).length;

  // Processar estatísticas de departamentos
  const departments: Record<string, number> = {};
  usersData.forEach(user => {
    if (user.department) {
      departments[user.department] = (departments[user.department] || 0) + 1;
    }
  });

  const departmentStats = Object.entries(departments)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Processar estatísticas de cargos
  const positions: Record<string, number> = {};
  usersData.forEach(user => {
    if (user.position) {
      positions[user.position] = (positions[user.position] || 0) + 1;
    }
  });

  const positionStats = Object.entries(positions)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Processar estatísticas de autorizações
  const emailAuths = authData.filter(auth => auth.email && auth.status === 'active').length;
  const phoneAuths = authData.filter(auth => auth.phone_number && auth.status === 'active').length;
  const domainAuths = authData.filter(auth => auth.domain && auth.status === 'active').length;
  const inviteAuths = authData.filter(auth => auth.invite_code && auth.status === 'active').length;
  const pendingAuths = authData.filter(auth => auth.status === 'pending').length;
  const rejectedAuths = authData.filter(auth => auth.status === 'rejected').length;

  // Montar resposta
  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newLast30Days: newUsers,
      activeLast7Days: recentlyActiveUsers
    },
    authorizations: {
      email: emailAuths,
      phone: phoneAuths,
      domain: domainAuths,
      inviteCode: inviteAuths,
      pending: pendingAuths,
      rejected: rejectedAuths
    },
    departments: departmentStats,
    positions: positionStats
  };
}
