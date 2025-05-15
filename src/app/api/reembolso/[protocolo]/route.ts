import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obter uma solicitação de reembolso pelo protocolo
export async function GET(
  request: NextRequest,
  { params }: { params: { protocolo: string } }
) {
  try {
    const protocolo = params.protocolo;

    // Buscar o reembolso pelo protocolo usando Prisma
    const reembolso = await prisma.reimbursement.findUnique({
      where: { protocolo }
    });

    if (!reembolso) {
      return NextResponse.json(
        { error: 'Solicitação de reembolso não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(reembolso);
  } catch (error) {
    console.error('Erro ao obter solicitação de reembolso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar o status de uma solicitação de reembolso
export async function PUT(
  request: NextRequest,
  { params }: { params: { protocolo: string } }
) {
  try {
    const protocolo = params.protocolo;
    const body = await request.json();
    const { status, observacao, usuarioId } = body;

    // Validar os dados
    if (!status || !['pendente', 'aprovado', 'rejeitado'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Buscar o reembolso pelo protocolo
    const reembolso = await prisma.reimbursement.findUnique({
      where: { protocolo }
    });

    if (!reembolso) {
      return NextResponse.json(
        { error: 'Solicitação de reembolso não encontrada' },
        { status: 404 }
      );
    }

    // Criar novo item de histórico
    const novoHistorico = {
      data: new Date(),
      status,
      observacao,
      usuarioId
    };

    // Atualizar o reembolso com Prisma
    const reembolsoAtualizado = await prisma.reimbursement.update({
      where: { protocolo },
      data: {
        status,
        historico: [...reembolso.historico, novoHistorico]
      }
    });

    return NextResponse.json({
      success: true,
      message: `Status atualizado para ${status}`,
      data: reembolsoAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar solicitação de reembolso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
