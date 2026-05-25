import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader || undefined);
    if (!token) {
      const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
      if (tokenCookie) token = tokenCookie.value;
    }
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id } = await params;

    const { data: cert, error: fetchError } = await supabaseAdmin
      .from('esocial_certificados')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !cert) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    const { error: deactivateError } = await supabaseAdmin
      .from('esocial_certificados')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .neq('id', id);

    if (deactivateError) {
      console.error('Erro ao desativar certificados anteriores:', deactivateError);
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('esocial_certificados')
      .update({ ativo: true, status: 'valido', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao ativar certificado:', updateError);
      return NextResponse.json({ error: 'Erro ao ativar certificado' }, { status: 500 });
    }

    return NextResponse.json({ success: true, certificado: updated });
  } catch (error) {
    console.error('Erro em PUT /api/e-social/certificados/[id]/ativar:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
