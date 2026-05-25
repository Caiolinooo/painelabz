import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { sugerirBack } from '@/lib/gestao-tripulantes/algoritmo-back';

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

    const body = await request.json();
    const { colaborador_embarcado_id, data_inicio, limite } = body;

    if (!colaborador_embarcado_id || !data_inicio) {
      return NextResponse.json({ error: 'colaborador_embarcado_id e data_inicio são obrigatórios' }, { status: 400 });
    }

    const candidatos = await sugerirBack({ colaborador_embarcado_id, data_inicio });

    const limitado = limite ? candidatos.slice(0, limite) : candidatos;

    return NextResponse.json({
      success: true,
      data: limitado,
      meta: {
        total: candidatos.length,
        exibindo: limitado.length,
        colaborador_embarcado_id,
        data_inicio
      }
    });
  } catch (error) {
    console.error('Erro na API sugestao-back:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
