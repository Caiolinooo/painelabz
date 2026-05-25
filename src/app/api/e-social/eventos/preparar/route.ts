import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { generateEventXML, validateEventXML, validateEventData } from '@/services/eSocialService';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    if (!body.evento_codigo) {
      return NextResponse.json({ error: 'evento_codigo é obrigatório' }, { status: 400 });
    }
    if (!body.dados_evento) {
      return NextResponse.json({ error: 'dados_evento é obrigatório' }, { status: 400 });
    }

    const dataValidation = validateEventData(body.evento_codigo, body.dados_evento);
    const allErrors = [...dataValidation.erros];

    let xmlGerado = '';
    let xmlValidation = { valido: false, erros: [] as string[] };

    if (dataValidation.valido) {
      xmlGerado = generateEventXML(body.evento_codigo, body.dados_evento);
      xmlValidation = validateEventXML(xmlGerado);
      allErrors.push(...xmlValidation.erros);
    }

    const status = !dataValidation.valido ? 'erro'
      : !xmlValidation.valido ? 'rascunho'
      : 'pendente_revisao';

    const { data: evento, error } = await supabaseAdmin
      .from('esocial_eventos')
      .insert({
        evento_codigo: body.evento_codigo,
        cpf_trabalhador: body.cpf_trabalhador ? String(body.cpf_trabalhador).replace(/\D/g, '') : (body.cpf ? String(body.cpf).replace(/\D/g, '') : null),
        cnpj_empregador: body.cnpj_empregador ? String(body.cnpj_empregador).replace(/\D/g, '') : (body.cnpj ? String(body.cnpj).replace(/\D/g, '') : null),
        matricula: body.matricula || null,
        dados_evento: body.dados_evento,
        xml_gerado: xmlGerado || null,
        status,
        modulo_origem: body.modulo_origem || 'manual',
        entidade_origem_id: body.entidade_origem_id || null,
        entidade_origem_tipo: body.entidade_origem_tipo || null,
        erros_processamento: allErrors.length > 0 ? allErrors : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao preparar evento e-social:', error);
      return NextResponse.json({ error: 'Erro ao preparar evento' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      evento,
      xml_preview: xmlGerado ? xmlGerado.substring(0, 2000) : null,
      validacao: {
        dados: dataValidation,
        xml: xmlValidation,
        valido: allErrors.length === 0,
        erros: allErrors,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Erro em POST /api/e-social/eventos/preparar:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
