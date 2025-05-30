import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken, generateToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

console.log('API token-refresh - Inicializando cliente Supabase');

// POST - Renovar token
export async function POST(request: NextRequest) {
  try {
    // Extrair o token do cabeçalho
    const authHeader = request.headers.get('authorization');
    console.log('Cabeçalho de autorização recebido:', authHeader ? 'Presente' : 'Ausente');

    const token = extractTokenFromHeader(authHeader);
    console.log('Token extraído:', token ? 'Presente' : 'Ausente');

    if (!token) {
      console.log('Token não fornecido, retornando erro 401');
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Verificar o token
    const payload = verifyToken(token);
    console.log('Resultado da verificação do token:', payload ? 'Válido' : 'Inválido');

    if (!payload) {
      console.log('Token inválido ou expirado, retornando erro 401');
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    // Buscar o usuário no Supabase
    console.log('Buscando usuário no Supabase com ID:', payload.userId);

    try {
      // Buscar o usuário na tabela users_unified
      const { data: user, error: userError } = await supabaseAdmin
        .from('users_unified')
        .select('*')
        .eq('id', payload.userId)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);

        // Verificar se é o administrador principal
        const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
        const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';

        // Se o payload contiver o email ou telefone do administrador, gerar um token de administrador
        if (payload.phoneNumber === adminPhone ||
            (payload.email && payload.email === adminEmail)) {

          console.log('Usuário é o administrador principal. Gerando token de administrador...');

          // Gerar um novo token para o administrador
          const adminToken = generateToken({
            id: payload.userId,
            phoneNumber: adminPhone,
            role: 'ADMIN'
          });

          return NextResponse.json({
            success: true,
            token: adminToken,
            user: {
              id: payload.userId,
              firstName: process.env.ADMIN_FIRST_NAME || 'Caio',
              lastName: process.env.ADMIN_LAST_NAME || 'Correia',
              email: adminEmail,
              phoneNumber: adminPhone,
              role: 'ADMIN',
              position: 'Administrador do Sistema',
              department: 'TI',
              active: true,
              accessPermissions: {
                modules: {
                  dashboard: true,
                  manual: true,
                  procedimentos: true,
                  politicas: true,
                  calendario: true,
                  noticias: true,
                  reembolso: true,
                  contracheque: true,
                  ponto: true,
                  admin: true
                }
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }

        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      // Corrigido: Retornar um NextResponse.json com o token e o usuário
      if (user) {
        // Gerar um novo token
        const newToken = generateToken({
          id: user.id,
          phoneNumber: user.phone_number,
          role: user.role
        });

        return NextResponse.json({
          success: true,
          token: newToken,
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phoneNumber: user.phone_number,
            role: user.role,
            position: user.position,
            department: user.department,
            active: user.active,
            accessPermissions: user.access_permissions,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Usuário não encontrado após busca' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('Erro ao buscar usuário no Supabase:', error);

      // Verificar se é o administrador principal
      const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
      const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';

      // Se o payload contiver o email ou telefone do administrador, gerar um token de administrador
      if (payload.phoneNumber === adminPhone) {
        console.log('Usuário é o administrador principal pelo telefone. Gerando token de administrador...');

        // Gerar um novo token para o administrador
        const adminToken = generateToken({
          id: payload.userId,
          phoneNumber: adminPhone,
          role: 'ADMIN'
        });

        return NextResponse.json({
          success: true,
          token: adminToken,
          user: {
            id: payload.userId,
            firstName: process.env.ADMIN_FIRST_NAME || 'Caio',
            lastName: process.env.ADMIN_LAST_NAME || 'Correia',
            email: adminEmail,
            phoneNumber: adminPhone,
            role: 'ADMIN',
            position: 'Administrador do Sistema',
            department: 'TI',
            active: true,
            accessPermissions: {
              modules: {
                dashboard: true,
                manual: true,
                procedimentos: true,
                politicas: true,
                calendario: true,
                noticias: true,
                reembolso: true,
                contracheque: true,
                ponto: true,
                admin: true
              }
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      return NextResponse.json(
        { error: 'Erro ao buscar usuário' },
        { status: 500 }
      );
    }

    // Este código nunca será alcançado devido aos retornos anteriores
    // Removido para evitar código morto
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
