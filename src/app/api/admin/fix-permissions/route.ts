import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

// Criar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Verificar se a chave de serviço está presente e tem o formato correto
if (!supabaseServiceKey || supabaseServiceKey.length < 100) {
  console.error('ERRO CRÍTICO: Chave de serviço do Supabase inválida ou ausente!');
  console.error('Comprimento da chave:', supabaseServiceKey ? supabaseServiceKey.length : 0);
  console.error('A chave deve ser um JWT completo, não apenas um prefixo como "sbp_"');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('Inicializando cliente Supabase com URL:', supabaseUrl);
console.log('Chave de serviço presente:', supabaseServiceKey ? 'Sim' : 'Não');

export async function POST(request: NextRequest) {
  try {
    // Extrair o token do cabeçalho
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Verificar o token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    console.log('Payload do token:', payload);

    // Buscar o usuário no Supabase
    console.log('Buscando usuário com ID:', payload.userId);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .single();

    console.log('Usuário encontrado:', user || 'Nenhum', 'Erro:', userError || 'Nenhum');

    if (userError || !user) {
      console.error('Erro ao buscar usuário:', userError);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    console.log('Usuário encontrado:', user);

    // Verificar se o usuário é o administrador
    const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
    const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
    const isAdmin = user.email === adminEmail || user.phone_number === adminPhone;

    console.log('Verificando se é o administrador principal:', {
      isAdmin,
      userEmail: user.email,
      adminEmail,
      userPhone: user.phone_number,
      adminPhone
    });

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas o administrador pode usar esta API' },
        { status: 403 }
      );
    }

    // Atualizar o papel do usuário para ADMIN
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: 'ADMIN' })
      .eq('id', user.id);

    if (updateError) {
      console.error('Erro ao atualizar papel do usuário:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar papel do usuário', details: updateError.message },
        { status: 500 }
      );
    }

    // Verificar se o usuário tem permissões de administrador
    console.log('Verificando permissões de administrador para o usuário:', user?.id);

    const { data: permissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user?.id)
      .eq('module', 'admin');

    console.log('Permissões encontradas:', permissions || 'Nenhuma', 'Erro:', permissionsError || 'Nenhum');

    if (permissionsError) {
      console.error('Erro ao verificar permissões de administrador:', permissionsError);
    }

    // Se não tiver permissões de administrador, adicionar
    if (!permissions || permissions.length === 0) {
      console.log('Adicionando permissões de administrador para usuário existente');

      const permissionsToAdd = [
        { user_id: user?.id, module: 'admin', feature: null },
        { user_id: user?.id, module: 'dashboard', feature: null },
        { user_id: user?.id, module: 'users', feature: null },
        { user_id: user?.id, module: 'settings', feature: null },
        { user_id: user?.id, module: 'avaliacao', feature: null }
      ];

      console.log('Permissões a serem adicionadas:', permissionsToAdd);

      const { data: insertData, error: insertError } = await supabase
        .from('user_permissions')
        .insert(permissionsToAdd);

      console.log('Resultado da inserção de permissões:', insertData || 'Sem dados', 'Erro:', insertError || 'Nenhum');

      if (insertError) {
        console.error('Erro ao adicionar permissões de administrador:', insertError);
        return NextResponse.json(
          { error: 'Erro ao adicionar permissões de administrador', details: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Permissões de administrador atualizadas com sucesso',
      user: {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        role: 'ADMIN'
      }
    });
  } catch (error) {
    console.error('Erro ao processar solicitação:', error);

    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
