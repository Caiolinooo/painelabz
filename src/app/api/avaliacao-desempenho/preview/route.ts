import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';

/**
 * Rota para processar preview de importação
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

    // Processar o arquivo
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Verificar tipo de arquivo
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Apenas arquivos .xlsx e .xls são suportados.' },
        { status: 400 }
      );
    }

    // Simular processamento de arquivo
    // Em uma implementação real, você processaria o arquivo aqui
    const previewData = [
      { 
        id: 1, 
        status: 'valid', 
        data: {
          nome: 'João Silva',
          email: 'joao.silva@example.com',
          cargo: 'Desenvolvedor',
          departamento: 'TI',
          dataAdmissao: '2023-01-01'
        }
      },
      { 
        id: 2, 
        status: 'valid', 
        data: {
          nome: 'Maria Souza',
          email: 'maria.souza@example.com',
          cargo: 'Analista',
          departamento: 'RH',
          dataAdmissao: '2023-02-01'
        }
      },
      { 
        id: 3, 
        status: 'error', 
        data: {
          nome: 'Pedro Santos',
          email: 'pedro.santos@example.com',
          cargo: '',
          departamento: 'Financeiro',
          dataAdmissao: '2023-03-01'
        },
        errors: ['O campo cargo é obrigatório']
      },
    ];

    return NextResponse.json({
      success: true,
      data: previewData,
      message: 'Arquivo processado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao processar preview:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
