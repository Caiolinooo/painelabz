import { NextRequest, NextResponse } from 'next/server';
import { initAvaliacaoModule } from '@/lib/avaliacao-module';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

/**
 * Rota para importar funcionários para o módulo de avaliação de desempenho
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
    
    if (!data || !Array.isArray(data.funcionarios) || data.funcionarios.length === 0) {
      return NextResponse.json(
        { error: 'Dados inválidos. É necessário fornecer um array de funcionários.' },
        { status: 400 }
      );
    }

    // Importar funcionários
    const resultado = await avaliacaoModule.importFuncionarios(data.funcionarios);

    return NextResponse.json({
      success: true,
      message: 'Importação concluída com sucesso',
      resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao importar funcionários:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
