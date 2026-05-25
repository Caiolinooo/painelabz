import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { data, error } = await supabaseAdmin
      .from('gt_configuracoes')
      .select('*');

    if (error) {
      console.error('Erro ao buscar configurações:', error);
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
    }

    const configMap: Record<string, any> = {};
    if (data) {
      for (const row of data) {
        configMap[row.chave] = row.valor;
      }
    }

    return NextResponse.json({
      success: true,
      data: configMap
    });
  } catch (error) {
    console.error('Erro na API configurações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    for (const [chave, valor] of Object.entries(body)) {
      const { error: upsertError } = await supabaseAdmin
        .from('gt_configuracoes')
        .upsert(
          { chave, valor, updated_at: new Date().toISOString() },
          { onConflict: 'chave' }
        );

      if (upsertError) {
        console.error(`Erro ao salvar configuração ${chave}:`, upsertError);
        return NextResponse.json({ error: `Erro ao salvar configuração ${chave}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
