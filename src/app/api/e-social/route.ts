import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      modulo: 'e-social',
      status: 'online',
      versao: '1.0.0',
      descricao: 'Módulo de integração com o Sistema de Escrituração Digital das Obrigações Fiscais, Previdenciárias e Trabalhistas',
      endpoints: [
        { path: '/api/e-social/eventos', methods: ['GET', 'POST'] },
        { path: '/api/e-social/eventos/[id]', methods: ['GET', 'PUT', 'DELETE'] },
        { path: '/api/e-social/eventos/preparar', methods: ['POST'] },
        { path: '/api/e-social/eventos/[id]/revisar', methods: ['PUT'] },
        { path: '/api/e-social/eventos/[id]/enviar', methods: ['POST'] },
        { path: '/api/e-social/catalogo', methods: ['GET'] },
        { path: '/api/e-social/certificados', methods: ['GET', 'POST'] },
        { path: '/api/e-social/configuracoes', methods: ['GET', 'PUT'] },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro em GET /api/e-social:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
