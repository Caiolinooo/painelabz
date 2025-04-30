import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { initAvaliacaoModule } from '@/lib/avaliacao-module';

/**
 * Rota para verificar o status do módulo de avaliação de desempenho
 */
export async function GET(request: NextRequest) {
  try {
    // Inicializar o módulo
    const module = await initAvaliacaoModule();

    return NextResponse.json({
      status: 'online',
      message: 'Módulo de avaliação de desempenho está funcionando corretamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar status do módulo de avaliação de desempenho:', error);

    return NextResponse.json({
      status: 'error',
      message: 'Erro ao inicializar módulo de avaliação de desempenho',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
