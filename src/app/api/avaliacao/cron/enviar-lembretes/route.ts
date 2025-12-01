import { NextRequest, NextResponse } from 'next/server';
import { AvaliacaoWorkflowService } from '@/lib/services/avaliacao-workflow-service';

/**
 * API para envio de lembretes de avaliações pendentes
 * Executado diariamente para verificar avaliações próximas do vencimento (3 dias)
 *
 * Fluxo:
 * 1. Buscar avaliações com status 'pendente' ou 'em_andamento'
 * 2. Filtrar avaliações com data_fim entre HOJE e HOJE+3
 * 3. Enviar lembretes para funcionário e gerente
 * 4. Registrar log de execução
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar autenticação (Vercel Cron Secret ou token admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-vercel-cron-secret');

    const isVercelCron = cronSecret === process.env.CRON_SECRET;
    const isAdminToken = authHeader && authHeader.startsWith('Bearer ');

    if (!isVercelCron && !isAdminToken) {
      console.error('❌ Tentativa não autorizada de executar cron de lembretes');
      return NextResponse.json(
        {
          success: false,
          error: 'Não autorizado',
        },
        { status: 401 }
      );
    }

    console.log('🔔 Iniciando processo de envio de lembretes de avaliações...');

    // Executar verificação e envio de lembretes
    const resultado = await AvaliacaoWorkflowService.verificarEnviarLembretes();

    const tempoExecucao = Date.now() - startTime;

    if (!resultado.success) {
      console.error(`❌ Erro ao enviar lembretes: ${resultado.error}`);
      return NextResponse.json(
        {
          success: false,
          error: resultado.error,
          tempo_execucao_ms: tempoExecucao,
        },
        { status: 500 }
      );
    }

    console.log(`✅ Processo de lembretes concluído em ${tempoExecucao}ms`);
    console.log(`📊 Total de lembretes enviados: ${resultado.lembretesEnviados || 0}`);

    return NextResponse.json({
      success: true,
      message: 'Lembretes enviados com sucesso',
      lembretes_enviados: resultado.lembretesEnviados || 0,
      tempo_execucao_ms: tempoExecucao,
    });
  } catch (error: any) {
    console.error('❌ Erro no processo de envio de lembretes:', error);

    const tempoExecucao = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro desconhecido',
        tempo_execucao_ms: tempoExecucao,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para testar manualmente (apenas em desenvolvimento)
 */
export async function GET(request: NextRequest) {
  // Permitir apenas em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint GET não disponível em produção. Use POST com autenticação.' },
      { status: 403 }
    );
  }

  console.log('⚠️  Executando cron de lembretes via GET (apenas desenvolvimento)');

  // Redirecionar para POST
  return POST(request);
}
