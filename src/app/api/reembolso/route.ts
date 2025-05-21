import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { generateProtocol } from '@/lib/utils';
import { sendReimbursementConfirmationEmail } from '@/lib/notifications';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// Função auxiliar para verificar se a tabela de reembolsos existe
async function checkReimbursementTableExists() {
  try {
    console.log('Verificando se a tabela de reembolsos existe...');

    // Verificar se a tabela Reimbursement existe usando metadados do Supabase
    const { data: tableExists, error } = await supabaseAdmin
      .from('Reimbursement')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Tabela Reimbursement não encontrada:', error);

      // Tentar com o nome alternativo
      const { data: altTableExists, error: altError } = await supabaseAdmin
        .from('reimbursements')
        .select('id')
        .limit(1);

      if (altError) {
        console.error('Tabela reimbursements também não encontrada:', altError);
        return { exists: false, tableName: null };
      }

      console.log('Tabela reimbursements encontrada');
      return { exists: true, tableName: 'reimbursements' };
    }

    console.log('Tabela Reimbursement encontrada');
    return { exists: true, tableName: 'Reimbursement' };
  } catch (error) {
    console.error('Exceção ao verificar tabela de reembolsos:', error);
    return { exists: false, tableName: null };
  }
}

// Instruções para criar a tabela manualmente
function getCreateTableInstructions() {
  return `
Para criar a tabela Reimbursement, acesse o SQL Editor no Supabase e execute o seguinte SQL:

CREATE TABLE IF NOT EXISTS "Reimbursement" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "cargo" TEXT NOT NULL,
  "centro_custo" TEXT NOT NULL,
  "data" TIMESTAMP NOT NULL,
  "tipo_reembolso" TEXT NOT NULL,
  "icone_reembolso" TEXT,
  "descricao" TEXT NOT NULL,
  "valor_total" NUMERIC NOT NULL,
  "moeda" TEXT NOT NULL DEFAULT 'BRL',
  "metodo_pagamento" TEXT NOT NULL,
  "banco" TEXT,
  "agencia" TEXT,
  "conta" TEXT,
  "pix_tipo" TEXT,
  "pix_chave" TEXT,
  "comprovantes" JSONB NOT NULL,
  "observacoes" TEXT,
  "protocolo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "historico" JSONB NOT NULL,
  "anexos_drive" JSONB[],

  CONSTRAINT "Reimbursement_protocolo_key" UNIQUE ("protocolo")
);

-- Adicionar políticas de segurança para a tabela
ALTER TABLE "Reimbursement" ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso a todos os usuários autenticados
CREATE POLICY "Reimbursement Access Policy"
ON "Reimbursement"
FOR ALL
TO authenticated
USING (true);
  `;
}

// Verificar se um email pertence ao domínio groupabz.com
function isGroupABZEmail(email: string): boolean {
  return email?.toLowerCase().endsWith('@groupabz.com') || false;
}

// POST - Criar uma nova solicitação de reembolso
export async function POST(request: NextRequest) {
  try {
    // Variáveis que precisam estar disponíveis em todo o escopo da função
    let tableName = null;
    let reembolsoCriado = null;

    // Obter dados do corpo da requisição
    const body = await request.json();
    const {
      nome,
      email,
      telefone,
      cpf,
      cargo,
      centroCusto,
      data,
      tipoReembolso,
      iconeReembolso,
      descricao,
      valorTotal,
      moeda,
      metodoPagamento,
      banco,
      agencia,
      conta,
      pixTipo,
      pixChave,
      comprovantes,
      observacoes
    } = body;

    // Validar os dados de entrada
    if (!nome || !email || !telefone || !cpf || !cargo || !centroCusto ||
        !data || !tipoReembolso || !descricao || !valorTotal ||
        !metodoPagamento || !comprovantes || comprovantes.length === 0) {
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      );
    }

    // Validar campos específicos para cada método de pagamento
    if (metodoPagamento === 'deposito' && (!banco || !agencia || !conta)) {
      return NextResponse.json(
        { error: 'Dados bancários são obrigatórios para depósito' },
        { status: 400 }
      );
    }

    if (metodoPagamento === 'pix' && (!pixTipo || !pixChave)) {
      return NextResponse.json(
        { error: 'Tipo e chave PIX são obrigatórios para pagamento via PIX' },
        { status: 400 }
      );
    }

    // Gerar protocolo único
    const protocolo = generateProtocol();

    // Data atual para o histórico e timestamps
    const dataAtual = new Date().toISOString();

    // Verificar se a tabela existe
    const { exists, tableName: detectedTableName } = await checkReimbursementTableExists();

    if (!exists || !detectedTableName) {
      return NextResponse.json(
        {
          error: 'Tabela de reembolsos não encontrada',
          instructions: getCreateTableInstructions()
        },
        { status: 500 }
      );
    }

    tableName = detectedTableName;

    // Criar objeto com os dados do reembolso
    const reimbursementData = {
      id: crypto.randomUUID(),
      nome,
      email,
      telefone,
      cpf,
      cargo,
      centro_custo: centroCusto,
      data: new Date(data).toISOString(),
      tipo_reembolso: tipoReembolso,
      icone_reembolso: iconeReembolso,
      descricao,
      valor_total: valorTotal,
      moeda: moeda || 'BRL',
      metodo_pagamento: metodoPagamento,
      banco: metodoPagamento === 'deposito' ? banco : null,
      agencia: metodoPagamento === 'deposito' ? agencia : null,
      conta: metodoPagamento === 'deposito' ? conta : null,
      pix_tipo: metodoPagamento === 'pix' ? pixTipo : null,
      pix_chave: metodoPagamento === 'pix' ? pixChave : null,
      comprovantes,
      observacoes,
      protocolo,
      status: 'pendente',
      created_at: dataAtual,
      updated_at: dataAtual,
      historico: [{
        data: dataAtual,
        status: 'pendente',
        observacao: 'Solicitação criada pelo usuário'
      }]
    };

    // Inserir no banco de dados
    const { data: inserted, error } = await supabaseAdmin
      .from(tableName)
      .insert(reimbursementData)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar reembolso:', error);
      return NextResponse.json(
        { error: 'Erro ao criar reembolso no banco de dados' },
        { status: 500 }
      );
    }

    reembolsoCriado = inserted;

    // Enviar email de confirmação
    try {
      const valorFormatado = typeof valorTotal === 'number'
        ? valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: moeda || 'BRL' })
        : valorTotal;

      await sendReimbursementConfirmationEmail(
        email,
        nome,
        protocolo,
        valorFormatado,
        body,
        [], // attachments - array vazio pois não estamos processando anexos neste momento
        [] // additionalRecipients - array vazio pois não estamos configurando destinatários adicionais
      );
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não interromper o fluxo se o email falhar
    }

    return NextResponse.json({
      success: true,
      message: 'Reembolso criado com sucesso',
      data: {
        protocolo,
        id: reembolsoCriado.id
      }
    });

  } catch (error) {
    console.error('Erro ao processar reembolso:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar reembolso' },
      { status: 500 }
    );
  }
}

// GET - Obter todas as solicitações de reembolso (com filtros opcionais)
export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const email = searchParams.get('email');
    const protocolo = searchParams.get('protocolo');
    const cpf = searchParams.get('cpf');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Verificar se a tabela existe
    const { exists, tableName: detectedTableName } = await checkReimbursementTableExists();

    if (!exists || !detectedTableName) {
      return NextResponse.json(
        {
          error: 'Tabela de reembolsos não encontrada',
          instructions: getCreateTableInstructions()
        },
        { status: 500 }
      );
    }

    const tableName = detectedTableName;

    // Construir consulta
    let query = supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (status) query = query.eq('status', status);
    if (email) query = query.ilike('email', email);
    if (protocolo) query = query.eq('protocolo', protocolo);
    if (cpf) query = query.eq('cpf', cpf);
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%,protocolo.ilike.%${search}%`);
    }
    if (dataInicio) query = query.gte('created_at', dataInicio);
    if (dataFim) query = query.lte('created_at', dataFim);

    // Ordenação e paginação
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    // Executar consulta
    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao consultar reembolsos:', error);
      return NextResponse.json(
        { error: 'Erro ao consultar reembolsos' },
        { status: 500 }
      );
    }

    // Calcular paginação
    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    });

  } catch (error) {
    console.error('Erro ao obter reembolsos:', error);
    return NextResponse.json(
      { error: 'Erro interno ao obter reembolsos' },
      { status: 500 }
    );
  }
}
