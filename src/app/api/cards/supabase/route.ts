import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obter todos os cards
export async function GET(request: NextRequest) {
  try {
    console.log('API de cards Supabase - Recebendo requisição GET');

    // Verificar autenticação
    const authHeader = request.headers.get('authorization') || '';
    console.log('Cabeçalho de autorização:', authHeader ? 'Presente' : 'Ausente');

    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      console.log('Token não fornecido');
      return NextResponse.json(
        { error: 'Não autorizado. Token não fornecido.' },
        { status: 401 }
      );
    }

    // Verificar se o token é válido
    let payload;
    try {
      payload = verifyToken(token);
      if (!payload) {
        console.log('Token inválido ou expirado');
        return NextResponse.json(
          { error: 'Token inválido ou expirado' },
          { status: 401 }
        );
      }
      console.log('Token válido para usuário:', payload.userId);
    } catch (tokenError) {
      console.error('Erro ao verificar token:', tokenError);
      return NextResponse.json(
        { error: 'Erro ao verificar token de autenticação' },
        { status: 401 }
      );
    }

    // Verificar se o usuário existe no Supabase
    console.log('Buscando usuário no Supabase com ID:', payload.userId);
    const { data: user, error: userError } = await supabaseAdmin
      .from('users_unified')
      .select('id, role, email, phone_number')
      .eq('id', payload.userId)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      // Não retornar erro aqui, pois o usuário pode ter acesso mesmo sem estar na tabela users
    }

    // Definir o administrador principal
    const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
    const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';

    // Verificar se o usuário é o administrador principal
    const isMainAdmin = user?.email === adminEmail || user?.phone_number === adminPhone;

    console.log('Buscando cards no Supabase...');

    // Buscar todos os cards
    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Erro ao buscar cards:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar cards', details: error.message },
        { status: 500 }
      );
    }

    // Filtrar cards com base nas permissões do usuário
    const userRole = user?.role || 'USER';
    const isAdmin = userRole === 'ADMIN' || isMainAdmin;
    const isManager = userRole === 'MANAGER';

    const filteredCards = cards.filter(card => {
      // Se o card estiver desabilitado, não mostrar
      if (!card.enabled) return false;

      // Se o card for apenas para admin e o usuário não for admin, não mostrar
      if (card.admin_only && !isAdmin) return false;

      // Se o card for apenas para gerentes e o usuário não for gerente nem admin, não mostrar
      if (card.manager_only && !(isManager || isAdmin)) return false;

      // Se o card tiver roles permitidas e o usuário não estiver nelas, não mostrar (exceto se for admin)
      if (card.allowed_roles && card.allowed_roles.length > 0) {
        if (!isAdmin && !card.allowed_roles.includes(userRole.toLowerCase())) {
          return false;
        }
      }

      // Se o card tiver IDs de usuários permitidos e o usuário não estiver neles, não mostrar (exceto se for admin)
      if (card.allowed_user_ids && card.allowed_user_ids.length > 0) {
        if (!isAdmin && !card.allowed_user_ids.includes(payload.userId)) {
          return false;
        }
      }

      return true;
    });

    console.log(`Retornando ${filteredCards.length} cards de ${cards.length} totais`);

    // Mapear para o formato esperado pelo frontend
    const formattedCards = filteredCards.map(card => ({
      id: card.id,
      title: card.title,
      description: card.description,
      href: card.href,
      icon: card.icon,
      color: card.color,
      hoverColor: card.hover_color,
      external: card.external || false,
      enabled: card.enabled !== false,
      order: card.order,
      adminOnly: card.admin_only || false,
      managerOnly: card.manager_only || false,
      allowedRoles: card.allowed_roles || [],
      allowedUserIds: card.allowed_user_ids || [],
    }));

    // Definir cabeçalhos para evitar cache
    const headers = new Headers();
    headers.append('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.append('Pragma', 'no-cache');
    headers.append('Expires', '0');

    return NextResponse.json(formattedCards, { headers });
  } catch (error) {
    console.error('Erro ao obter cards:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
