import { NextRequest, NextResponse } from 'next/server';
import { executarScrapingPoliWeb } from '@/lib/gestao-tripulantes/poliweb-service';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Endpoint de Cron para automatizar o scraping do PoliWeb
 * Frequência programada: Diariamente às 9h e 18h
 * 
 * Verificações de segurança:
 * - Vercel Cron Secret (x-vercel-cron-secret)
 * - Bearer Token (Administrador)
 */
export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecretHeader = request.headers.get('x-vercel-cron-secret');

    const isVercelCron = cronSecretHeader === process.env.CRON_SECRET;
    let isAdmin = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded && (decoded.role === 'ADMIN' || decoded.role === 'MANAGER')) {
        isAdmin = true;
      }
    }

    // Permitir se for Vercel Cron, token de admin ou rodando localmente sem secrets de produção configuradas
    const isLocalDevelopment = process.env.NODE_ENV === 'development';
    const isAuthorized = isVercelCron || isAdmin || isLocalDevelopment;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado ao agendador cron.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bypassConfig = searchParams.get('bypass_config') === 'true';

    console.log('⏰ Executando Cron do scraper PoliWeb...');
    const result = await executarScrapingPoliWeb();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Erro na rotina do PoliWeb' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Rotina de cron do PoliWeb executada com sucesso.',
      data: result.data
    });

  } catch (error: any) {
    console.error('Erro na rota de Cron PoliWeb:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
