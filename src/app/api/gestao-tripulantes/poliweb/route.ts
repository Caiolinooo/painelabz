import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { scrapePoliWeb, buscarASOsPendentes } from '@/lib/gestao-tripulantes/poliweb-scraper';
import { importarEProcessarASOs } from '@/lib/gestao-tripulantes/poliweb-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || undefined;
    const token = extractTokenFromHeader(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { acao } = body;

    if (acao === 'testar_conexao') {
      const result = await scrapePoliWeb();
      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Conexão com PoliWeb bem-sucedida' : result.error || 'Falha na conexão',
        data: result.success ? { asos_encontrados: result.data?.length || 0 } : undefined
      });
    }

    if (acao === 'buscar_pendentes' || acao === 'scraping') {
      const result = await buscarASOsPendentes();
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Erro ao buscar ASOs pendentes' }, { status: 500 });
      }

      if (!result.data || result.data.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            importados: [],
            total_encontrados: 0,
            total_importados: 0,
            total_erros: 0
          },
          message: 'Nenhum ASO pendente encontrado'
        });
      }

      const importResult = await importarEProcessarASOs(result.data);

      return NextResponse.json({
        success: importResult.success,
        data: {
          importados: importResult.importados,
          erros: importResult.erros.length > 0 ? importResult.erros : undefined,
          total_encontrados: importResult.totalEncontrados,
          total_importados: importResult.totalImportados,
          total_erros: importResult.totalErros
        },
        message: `${importResult.totalImportados} ASO(s) importado(s) com sucesso`
      });
    }

    return NextResponse.json({
      error: 'Ação inválida. Use "testar_conexao", "buscar_pendentes" ou "scraping"'
    }, { status: 400 });
  } catch (error) {
    console.error('Erro na API PoliWeb:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
