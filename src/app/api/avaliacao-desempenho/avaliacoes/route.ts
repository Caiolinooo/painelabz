import { NextRequest, NextResponse } from 'next/server';
import { initAvaliacaoModule } from '@/lib/avaliacao-module';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

/**
 * Rota para listar avaliações
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
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

    // Inicializar o módulo
    const avaliacaoModule = await initAvaliacaoModule();

    // Obter parâmetros da URL
    const url = new URL(request.url);
    const funcionarioId = url.searchParams.get('funcionarioId');

    // Buscar avaliações
    let avaliacoes;
    if (funcionarioId) {
      avaliacoes = await avaliacaoModule.getAvaliacoesByFuncionario(Number(funcionarioId));
    } else {
      avaliacoes = await avaliacaoModule.getAvaliacoes();
    }

    return NextResponse.json({
      success: true,
      data: avaliacoes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter avaliações:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Rota para criar uma nova avaliação
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
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

    // Inicializar o módulo
    const avaliacaoModule = await initAvaliacaoModule();

    // Obter dados do corpo da requisição
    const data = await request.json();

    if (!data || !data.funcionarioId) {
      return NextResponse.json(
        { error: 'Dados inválidos. É necessário fornecer o ID do funcionário.' },
        { status: 400 }
      );
    }

    // Criar avaliação
    const avaliacao = await avaliacaoModule.createAvaliacao({
      ...data,
      avaliadorId: payload.userId, // Usar o ID do usuário autenticado como avaliador
      dataAvaliacao: new Date().toISOString().split('T')[0],
      status: 'pendente'
    });

    return NextResponse.json({
      success: true,
      data: avaliacao,
      message: 'Avaliação criada com sucesso',
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
