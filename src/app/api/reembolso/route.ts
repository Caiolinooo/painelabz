import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Reimbursement from '@/models/Reimbursement';
import { generateProtocol } from '@/lib/utils';
import { sendReimbursementConfirmationEmail } from '@/lib/notifications';

// POST - Criar uma nova solicitação de reembolso
export async function POST(request: NextRequest) {
  try {
    // Conectar ao MongoDB
    await dbConnect();

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

    // Criar a solicitação de reembolso
    const reembolso = new Reimbursement({
      nome,
      email,
      telefone,
      cpf,
      cargo,
      centroCusto,
      data: new Date(data),
      tipoReembolso,
      iconeReembolso,
      descricao,
      valorTotal,
      moeda: moeda || 'BRL',
      metodoPagamento,
      banco: metodoPagamento === 'deposito' ? banco : undefined,
      agencia: metodoPagamento === 'deposito' ? agencia : undefined,
      conta: metodoPagamento === 'deposito' ? conta : undefined,
      pixTipo: metodoPagamento === 'pix' ? pixTipo : undefined,
      pixChave: metodoPagamento === 'pix' ? pixChave : undefined,
      comprovantes,
      observacoes,
      protocolo,
      status: 'pendente',
      historico: [{
        data: new Date(),
        status: 'pendente',
        observacao: 'Solicitação criada pelo usuário'
      }]
    });

    // Salvar no banco de dados
    await reembolso.save();

    // Enviar email de confirmação (se a função existir)
    try {
      if (typeof sendReimbursementConfirmationEmail === 'function') {
        await sendReimbursementConfirmationEmail(email, nome, protocolo, valorTotal);
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não interromper o fluxo se o email falhar
    }

    // Retornar resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Solicitação de reembolso enviada com sucesso',
      protocolo,
      data: reembolso
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao processar solicitação de reembolso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Obter todas as solicitações de reembolso (com filtros opcionais)
export async function GET(request: NextRequest) {
  try {
    // Conectar ao MongoDB
    await dbConnect();

    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const email = searchParams.get('email');
    const protocolo = searchParams.get('protocolo');
    const cpf = searchParams.get('cpf');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Construir filtro
    const filter: any = {};

    if (status) filter.status = status;
    if (email) filter.email = email;
    if (protocolo) filter.protocolo = protocolo;
    if (cpf) filter.cpf = cpf;

    // Filtro de data
    if (dataInicio || dataFim) {
      filter.dataCriacao = {};
      if (dataInicio) filter.dataCriacao.$gte = new Date(dataInicio);
      if (dataFim) filter.dataCriacao.$lte = new Date(dataFim);
    }

    // Executar consulta
    const reembolsos = await Reimbursement.find(filter)
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limit);

    // Contar total de registros para paginação
    const total = await Reimbursement.countDocuments(filter);

    return NextResponse.json({
      data: reembolsos,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao obter solicitações de reembolso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
