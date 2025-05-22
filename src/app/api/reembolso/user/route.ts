import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, TokenPayload } from '@/lib/auth'; // Importar TokenPayload

/**
 * API endpoint para obter reembolsos para um usuário específico.
 * Este endpoint lida com a busca de reembolsos com autenticação adequada e permissões baseadas no papel do usuário.
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Requisição de reembolsos do usuário recebida');

    // 1. Verificar autenticação e obter payload do token
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.error('Não autorizado: Token não fornecido');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload: TokenPayload | null = verifyToken(token); // Usar o tipo importado
    if (!payload) {
      console.error('Não autorizado: Token inválido ou expirado');
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const userRole = payload.role;
    // Obter o email principal do usuário logado a partir do payload do token ou do banco de dados
    // Priorizar o email do payload se existir, caso contrário buscar no banco
    let userEmail = payload.email || '';

    // Se o email não estiver no payload, buscar no banco
    if (!userEmail) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users_unified') // Assumindo que o email principal está nesta tabela
        .select('email')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Erro ao buscar email do usuário logado:', userError);
        // Continuar mesmo sem o email principal, a busca será feita pelos emails adicionais
      } else {
        userEmail = userData?.email || '';
      }
    }

    console.log('Usuário autenticado:', userId, 'Papel:', userRole, 'Email principal:', userEmail);

    // 2. Obter email do parâmetro de query (usado principalmente para admins/gerentes buscarem por email)
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email');

    // 3. Verificar permissões e determinar emails permitidos
    const isAdmin = userRole === 'ADMIN';
    const isManager = userRole === 'MANAGER';

    let allowedEmails: string[] = [];

    if (isAdmin || isManager) {
      // Admins e gerentes podem ver reembolsos de qualquer email (se fornecido na query)
      if (queryEmail) {
        allowedEmails.push(queryEmail.toLowerCase().trim());
        console.log(`Admin/Manager buscando por email específico: ${queryEmail}`);
      } else {
        // Se nenhum email for especificado na query, eles podem ver todos (não aplicamos filtro de email)
        console.log('Admin/Manager buscando todos os reembolsos');
        // Não adicionamos emails ao allowedEmails, a query não terá filtro de email
      }
    } else {
      // Usuários normais só podem ver seus próprios reembolsos
      // Buscar todos os emails associados a este userId na tabela user_emails
      const { data: userEmailsData, error: userEmailsError } = await supabaseAdmin
        .from('user_emails')
        .select('email')
        .eq('user_id', userId);

      if (userEmailsError) {
        console.error('Erro ao buscar e-mails adicionais do usuário:', userEmailsError);
        // Se houver erro, continuar apenas com o email principal (se disponível)
        if (userEmail) {
          allowedEmails.push(userEmail.toLowerCase().trim());
        }
      } else if (userEmailsData) {
        // Adicionar email principal (se disponível) e emails adicionais
        if (userEmail) {
          allowedEmails.push(userEmail.toLowerCase().trim());
        }
        const additionalEmails = userEmailsData.map(item => item.email.toLowerCase().trim());
        allowedEmails = [...new Set([...allowedEmails, ...additionalEmails])]; // Remover duplicatas
        console.log('Usuário normal buscando reembolsos associados aos seguintes emails:', allowedEmails);
      } else if (userEmail) {
         // Se não houver emails adicionais, usar apenas o email principal
         allowedEmails.push(userEmail.toLowerCase().trim());
         console.log('Usuário normal buscando reembolsos associados ao email principal:', userEmail);
      } else {
        // Se não houver email principal nem adicionais, não há emails para buscar
        console.log('Usuário sem emails associados, retornando lista vazia');
        return NextResponse.json({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            hasMore: false
          }
        });
      }

      // Se o queryEmail for fornecido por um usuário normal, verificar se ele está na lista de allowedEmails
      if (queryEmail && !allowedEmails.includes(queryEmail.toLowerCase().trim())) {
         console.error(`Usuário normal (${userEmail}) tentando acessar reembolsos de um email (${queryEmail}) que não está associado à sua conta.`);
         return NextResponse.json(
            { error: 'Não autorizado a ver reembolsos de outro usuário' },
            { status: 403 }
         );
      }
    }

    // 4. Obter parâmetros de paginação e filtro
    const { searchParams: paginationParams } = new URL(request.url);
    const status = paginationParams.get('status');
    const page = parseInt(paginationParams.get('page') || '1', 10);
    const limit = parseInt(paginationParams.get('limit') || '10', 10);

    // Calcular range de paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log('Buscando reembolsos com parâmetros:', {
      allowedEmails,
      status: status || 'all',
      page,
      limit,
      from,
      to
    });

    // 5. Construir e executar a query
    let query = supabaseAdmin
      .from('Reimbursement')
      .select('*', { count: 'exact' });

    // Aplicar filtro de email apenas se allowedEmails não estiver vazio (i.e., não admin/manager buscando todos)
    if (allowedEmails.length > 0) {
       query = query.in('email', allowedEmails);
    } else if (queryEmail) {
       // Se for admin/manager buscando por email específico, aplicar filtro
       query = query.eq('email', queryEmail.toLowerCase().trim());
    }

    // Aplicar filtro de status se fornecido
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Aplicar paginação e ordenação
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    // Executar a query
    const { data: reimbursements, error: queryError, count } = await query;

    if (queryError) {
      console.error('Erro ao consultar reembolsos:', queryError);
      return NextResponse.json(
        { error: 'Falha ao buscar reembolsos', details: queryError.message },
        { status: 500 }
      );
    }

    console.log(`Encontrados ${reimbursements?.length || 0} reembolsos, total: ${count}`);

    return NextResponse.json({
      data: reimbursements || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: count ? (from + limit < count) : false
      }
    });

  } catch (error) {
    console.error('Erro ao buscar reembolsos do usuário:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
