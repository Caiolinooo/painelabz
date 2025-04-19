import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

// Criar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/authorized-users
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

    // Obter parâmetros de consulta
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');

    // Construir consulta Supabase
    let query = supabase.from('authorized_users').select('*');

    // Adicionar filtros
    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      switch (type) {
        case 'email':
          query = query.not('email', 'is', null);
          break;
        case 'phone':
          query = query.not('phone_number', 'is', null);
          break;
        case 'domain':
          query = query.not('domain', 'is', null);
          break;
        case 'invite':
          query = query.not('invite_code', 'is', null);
          break;
      }
    }

    // Executar a consulta
    const { data: authorizedUsers, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erro ao buscar usuários autorizados:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar usuários autorizados' },
        { status: 500 }
      );
    }

    return NextResponse.json(authorizedUsers || []);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/admin/authorized-users
export async function POST(request: NextRequest) {
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
      .select('id, role, first_name, last_name')
      .eq('id', payload.userId)
      .single();

    if (userError || !requestingUser || requestingUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta API.' },
        { status: 403 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { action, email, phoneNumber, domain, notes } = body;

    let result;

    // Executar ação apropriada
    switch (action) {
      case 'add_user':
        // Adicionar usuário autorizado
        const { data: newUser, error: addUserError } = await supabase
          .from('authorized_users')
          .insert({
            email: email,
            phone_number: phoneNumber,
            created_by: payload.userId,
            notes: notes ? [notes] : [],
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (addUserError) {
          console.error('Erro ao adicionar usuário autorizado:', addUserError);
          return NextResponse.json(
            { error: 'Erro ao adicionar usuário autorizado', details: addUserError.message },
            { status: 500 }
          );
        }

        result = {
          success: true,
          message: 'Usuário autorizado adicionado com sucesso',
          user: newUser[0]
        };
        break;

      case 'add_domain':
        if (!domain) {
          return NextResponse.json(
            { error: 'Domínio é obrigatório' },
            { status: 400 }
          );
        }

        // Adicionar domínio autorizado
        const { data: newDomain, error: addDomainError } = await supabase
          .from('authorized_users')
          .insert({
            domain: domain,
            created_by: payload.userId,
            notes: notes ? [notes] : [],
            status: 'active', // Domínios são automaticamente ativos
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (addDomainError) {
          console.error('Erro ao adicionar domínio autorizado:', addDomainError);
          return NextResponse.json(
            { error: 'Erro ao adicionar domínio autorizado', details: addDomainError.message },
            { status: 500 }
          );
        }

        result = {
          success: true,
          message: 'Domínio autorizado adicionado com sucesso',
          domain: newDomain[0]
        };
        break;

      case 'generate_invite':
        // Gerar código de convite
        const expiryDays = body.expiryDays ? parseInt(body.expiryDays) : 7; // Padrão: 7 dias
        const maxUses = body.maxUses ? parseInt(body.maxUses) : 1; // Padrão: 1 uso

        // Gerar código aleatório
        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

        // Calcular data de expiração
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        // Salvar no banco de dados
        const { data: newInvite, error: inviteError } = await supabase
          .from('authorized_users')
          .insert({
            invite_code: inviteCode,
            created_by: payload.userId,
            notes: notes ? [notes] : [],
            status: 'active',
            expires_at: expiresAt.toISOString(),
            max_uses: maxUses,
            uses: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (inviteError) {
          console.error('Erro ao gerar código de convite:', inviteError);
          return NextResponse.json(
            { error: 'Erro ao gerar código de convite', details: inviteError.message },
            { status: 500 }
          );
        }

        result = {
          success: true,
          message: 'Código de convite gerado com sucesso',
          invite: newInvite[0]
        };
        break;

      case 'approve':
        if (!body.id) {
          return NextResponse.json(
            { error: 'ID é obrigatório' },
            { status: 400 }
          );
        }

        // Buscar o usuário para verificar se existe
        const { data: userToApprove, error: approveQueryError } = await supabase
          .from('authorized_users')
          .select('*')
          .eq('id', body.id)
          .single();

        if (approveQueryError || !userToApprove) {
          return NextResponse.json(
            { error: 'Usuário não encontrado' },
            { status: 404 }
          );
        }

        // Preparar a nota de aprovação
        const approveNoteMessage = `Aprovado por ${requestingUser.first_name} ${requestingUser.last_name} em ${new Date().toISOString()}`;

        // Atualizar o usuário
        const { data: approvedUser, error: approveError } = await supabase
          .from('authorized_users')
          .update({
            status: 'active',
            notes: [...(userToApprove.notes || []), approveNoteMessage],
            updated_at: new Date().toISOString(),
            updated_by: payload.userId
          })
          .eq('id', body.id)
          .select()
          .single();

        if (approveError) {
          console.error('Erro ao aprovar usuário:', approveError);
          return NextResponse.json(
            { error: 'Erro ao aprovar usuário', details: approveError.message },
            { status: 500 }
          );
        }

        result = {
          success: true,
          message: 'Usuário aprovado com sucesso',
          user: approvedUser
        };
        break;

      case 'reject':
        if (!body.id) {
          return NextResponse.json(
            { error: 'ID é obrigatório' },
            { status: 400 }
          );
        }

        // Buscar o usuário para verificar se existe
        const { data: userToReject, error: rejectQueryError } = await supabase
          .from('authorized_users')
          .select('*')
          .eq('id', body.id)
          .single();

        if (rejectQueryError || !userToReject) {
          return NextResponse.json(
            { error: 'Usuário não encontrado' },
            { status: 404 }
          );
        }

        // Preparar a nota de rejeição
        const rejectNoteMessage = `Rejeitado por ${requestingUser.first_name} ${requestingUser.last_name} em ${new Date().toISOString()}. Motivo: ${body.reason || 'Não especificado'}`;

        // Atualizar o usuário
        const { data: rejectedUser, error: rejectError } = await supabase
          .from('authorized_users')
          .update({
            status: 'rejected',
            notes: [...(userToReject.notes || []), rejectNoteMessage],
            updated_at: new Date().toISOString(),
            updated_by: payload.userId
          })
          .eq('id', body.id)
          .select()
          .single();

        if (rejectError) {
          console.error('Erro ao rejeitar usuário:', rejectError);
          return NextResponse.json(
            { error: 'Erro ao rejeitar usuário', details: rejectError.message },
            { status: 500 }
          );
        }

        result = {
          success: true,
          message: 'Usuário rejeitado com sucesso',
          user: rejectedUser
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
