import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint to get reimbursements for a specific user
 * This endpoint handles fetching reimbursements with proper authentication
 */
export async function GET(request: NextRequest) {
  try {
    console.log('User reimbursements request received');

    // Check authentication
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

    // If no token is provided, try to get it from the cookie
    let isAuthenticated = false;
    let userId = '';
    let userRole = '';
    let userEmail = '';

    if (token) {
      // Verify token if provided
      const payload = verifyToken(token);
      if (payload) {
        isAuthenticated = true;
        userId = payload.userId;
        userRole = payload.role;
        // COMENTADO: userEmail = payload.email || ''; // A propriedade email pode não existir no payload do token
        console.log('User authenticated via token:', userId, 'Role:', userRole);
      }
    } else {
      // Try to get session from Supabase
      const { data: { session } } = await supabaseAdmin.auth.getSession();
      if (session) {
        isAuthenticated = true;
        userId = session.user.id;
        userEmail = session.user.email || ''; // Obter email da sessão

        // Get user role from database
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('role, email')
          .eq('id', userId)
          .single();

        userRole = userData?.role || '';
        userEmail = userData?.email || userEmail;
        console.log('User authenticated via session:', userId, 'Role:', userRole);
      }
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      console.error('User not authenticated');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Get email from query parameter
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email');

    // Use the email from the query parameter or from the authenticated user
    const email = queryEmail || userEmail;

    if (!email) {
      console.error('No email provided');
      return NextResponse.json(
        { error: 'Email não fornecido' },
        { status: 400 }
      );
    }

    console.log(`Fetching reimbursements for email: ${email}`);

    // Normalize email for case-insensitive search
    const normalizedEmail = email.toLowerCase().trim();

    // Check if the user is an admin or manager (they can see all reimbursements)
    const isAdmin = userRole === 'ADMIN';
    const isManager = userRole === 'MANAGER';

    // If the user is not an admin or manager, they can only see their own reimbursements
    if (!isAdmin && !isManager && normalizedEmail !== userEmail.toLowerCase().trim()) {
      console.error('User trying to access reimbursements of another user');
      return NextResponse.json(
        { error: 'Não autorizado a ver reembolsos de outro usuário' },
        { status: 403 }
      );
    }

    // Get query parameters for pagination and filtering
    // Using a different variable name to avoid redeclaration
    const { searchParams: paginationParams } = new URL(request.url);
    const status = paginationParams.get('status');
    const page = parseInt(paginationParams.get('page') || '1', 10);
    const limit = parseInt(paginationParams.get('limit') || '10', 10);

    // Calculate pagination range
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log('Fetching reimbursements with params:', {
      email: normalizedEmail,
      status: status || 'all',
      page,
      limit,
      from,
      to
    });

    // Build the query with proper filters
    let query = supabaseAdmin
      .from('Reimbursement')
      .select('*', { count: 'exact' });

    // *** MODIFICAÇÃO AQUI: Buscar reembolsos associados a todos os e-mails do usuário ***
    let emailsToSearch = [normalizedEmail];

    // Se o usuário não for admin/manager, buscar os emails adicionais na tabela user_emails
    if (!isAdmin && !isManager) {
      const { data: userEmailsData, error: userEmailsError } = await supabaseAdmin
        .from('user_emails')
        .select('email')
        .eq('user_id', userId);

      if (userEmailsError) {
        console.error('Erro ao buscar e-mails adicionais do usuário:', userEmailsError);
        // Continuar com o email principal se houver erro ao buscar emails adicionais
      } else if (userEmailsData) {
        const additionalEmails = userEmailsData.map(item => item.email.toLowerCase().trim());
        emailsToSearch = [...new Set([...emailsToSearch, ...additionalEmails])]; // Remover duplicatas
        console.log('Buscando reembolsos associados aos seguintes emails:', emailsToSearch);
      }
    }

    // Apply email filter (buscar por qualquer um dos emails na lista)
    query = query.in('email', emailsToSearch);

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    // Execute the query
    const { data: reimbursements, error: queryError, count } = await query;

    if (queryError) {
      console.error('Error querying reimbursements:', queryError);

      // Try a more permissive query as fallback
      console.log('Trying fallback query with partial email match...');

      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('Reimbursement')
        .select('*')
        .ilike('email', `%${normalizedEmail}%`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return NextResponse.json(
          { error: 'Failed to fetch reimbursements', details: fallbackError.message },
          { status: 500 }
        );
      }

      if (fallbackData && fallbackData.length > 0) {
        console.log(`Found ${fallbackData.length} reimbursements with fallback query`);
        return NextResponse.json({
          data: fallbackData,
          pagination: {
            page,
            limit,
            total: fallbackData.length,
            hasMore: false
          }
        });
      }

      // If fallback also returned no results, return empty array
      return NextResponse.json({
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false
        }
      });
    }

    if (reimbursements && reimbursements.length > 0) {
      console.log(`Found ${reimbursements.length} reimbursements, total count: ${count}`);
      return NextResponse.json({
        data: reimbursements,
        pagination: {
          page,
          limit,
          total: count || reimbursements.length,
          hasMore: count ? (from + limit < count) : false
        }
      });
    }

    // If no results with exact match, try a more permissive search
    console.log('No results with exact match, trying partial match...');

    const { data: partialMatchData, error: partialMatchError } = await supabaseAdmin
      .from('Reimbursement')
      .select('*')
      .ilike('email', `%${normalizedEmail}%`)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!partialMatchError && partialMatchData && partialMatchData.length > 0) {
      console.log(`Found ${partialMatchData.length} reimbursements with partial email match`);
      return NextResponse.json({
        data: partialMatchData,
        pagination: {
          page,
          limit,
          total: partialMatchData.length,
          hasMore: false
        }
      });
    }

    // No reimbursements found
    console.log('No reimbursements found for email:', email);
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching user reimbursements:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
