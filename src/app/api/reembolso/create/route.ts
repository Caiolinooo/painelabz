import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization') || '';
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.error('Não autorizado: Token não fornecido');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      console.error('Não autorizado: Token inválido ou expirado');
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const userEmail = payload.email;

    console.log(`Usuário autenticado: ${userId}, Email: ${userEmail}`);

    // Obter dados do formulário
    const formData = await request.json();
    console.log('Dados recebidos para criação de reembolso:', formData);

    // Verificar se a tabela Reimbursement existe
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'Reimbursement');

    if (tablesError) {
      console.error('Erro ao verificar tabela Reimbursement:', tablesError);
      return NextResponse.json(
        { error: 'Erro ao verificar tabela de reembolsos' },
        { status: 500 }
      );
    }

    if (!tables || tables.length === 0) {
      console.log('Tabela Reimbursement não encontrada, tentando criar...');

      // Tentar criar a tabela
      const createResponse = await fetch('/api/reembolso/create-table', {
        method: 'POST',
      });

      if (!createResponse.ok) {
        console.error('Erro ao criar tabela Reimbursement');
        return NextResponse.json(
          { error: 'Erro ao criar tabela de reembolsos' },
          { status: 500 }
        );
      }

      console.log('Tabela Reimbursement criada com sucesso');
    }

    // Verificar se a coluna user_id existe
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'Reimbursement')
      .eq('column_name', 'user_id');

    if (columnsError) {
      console.error('Erro ao verificar coluna user_id:', columnsError);
    }

    if (!columns || columns.length === 0) {
      console.log('Coluna user_id não encontrada, tentando adicionar...');

      // Tentar adicionar a coluna
      const addColumnResponse = await fetch('/api/reembolso/add-user-id-column', {
        method: 'GET',
      });

      if (!addColumnResponse.ok) {
        console.error('Erro ao adicionar coluna user_id');
        // Continuar mesmo sem a coluna user_id
      } else {
        console.log('Coluna user_id adicionada com sucesso');
      }
    }

    // Gerar protocolo único
    const protocolo = `REEMB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Preparar dados para inserção
    const reimbursementData = {
      id: uuidv4(),
      nome: formData.nome,
      email: formData.email.toLowerCase().trim(),
      telefone: formData.telefone,
      cpf: formData.cpf,
      cargo: formData.cargo,
      centro_custo: formData.centroCusto,
      data: new Date(formData.data).toISOString(),
      tipo_reembolso: formData.tipoReembolso,
      icone_reembolso: getIconForReimbursementType(formData.tipoReembolso),
      descricao: formData.descricao,
      valor_total: parseFloat(formData.valorTotal.replace(/\./g, '').replace(',', '.')),
      moeda: formData.moeda,
      metodo_pagamento: formData.metodoPagamento,
      banco: formData.banco || null,
      agencia: formData.agencia || null,
      conta: formData.conta || null,
      pix_tipo: formData.pixTipo || null,
      pix_chave: formData.pixChave || null,
      comprovantes: formData.comprovantes || [],
      observacoes: formData.observacoes || null,
      protocolo,
      status: 'pendente',
      historico: [{
        data: new Date(),
        status: 'pendente',
        observacao: 'Solicitação criada',
        usuarioId: userId
      }],
      user_id: userId // Adicionar o ID do usuário
    };

    // Inserir no banco de dados
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('Reimbursement')
      .insert(reimbursementData)
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir reembolso:', insertError);
      return NextResponse.json(
        { error: `Erro ao criar reembolso: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('Reembolso criado com sucesso:', insertedData);

    return NextResponse.json({
      success: true,
      message: 'Reembolso criado com sucesso',
      protocolo,
      data: insertedData
    });

  } catch (error) {
    console.error('Erro ao processar criação de reembolso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar reembolso' },
      { status: 500 }
    );
  }
}

/**
 * Retorna o ícone correspondente ao tipo de reembolso
 */
function getIconForReimbursementType(type: string): string {
  const icons: Record<string, string> = {
    alimentacao: 'restaurant',
    transporte: 'directions_car',
    hospedagem: 'hotel',
    material: 'shopping_bag',
    servico: 'build',
    outro: 'more_horiz'
  };

  return icons[type] || 'receipt';
}
