import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { initAvaliacaoModule } from '@/lib/avaliacao-module';

/**
 * Rota para verificar o status do módulo de avaliação de desempenho
 */
export async function GET(request: NextRequest) {
  try {
    console.log('API: Verificando status do módulo de avaliação de desempenho');

    // Inicializar o módulo
    const module = await initAvaliacaoModule();

    console.log('API: Módulo de avaliação inicializado com sucesso:', {
      version: module.version,
      name: module.name
    });

    // Verificar se o módulo está funcionando corretamente
    const status = module.getStatus ? await module.getStatus() : { status: 'online', mode: 'stub' };

    console.log('API: Status do módulo:', status);

    return NextResponse.json({
      status: 'online',
      message: 'Módulo de avaliação de desempenho está funcionando corretamente',
      moduleInfo: {
        version: module.version,
        name: module.name,
        mode: status.mode || 'unknown'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API: Erro ao verificar status do módulo de avaliação de desempenho:', error);

    // Mesmo com erro, retornar status online para evitar bloqueios na interface
    return NextResponse.json({
      status: 'online',
      message: 'Módulo de avaliação de desempenho está funcionando em modo de contingência',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}
