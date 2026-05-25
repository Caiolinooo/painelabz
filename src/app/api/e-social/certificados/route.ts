import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { encryptPassword } from '@/lib/e-social/certificado';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'esocial-certificados';

async function ensureBucket(): Promise<boolean> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 5242880,
    });
    if (error) {
      console.error('Erro ao criar bucket:', error);
      return false;
    }
  }
  return true;
}

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader || undefined);
  if (!token) {
    const tokenCookie = request.cookies.get('abzToken') || request.cookies.get('token');
    if (tokenCookie) token = tokenCookie.value;
  }
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;
  return payload;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('esocial_certificados')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar certificados:', error);
      return NextResponse.json({ error: 'Erro ao listar certificados' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      certificados: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Erro em GET /api/e-social/certificados:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let nome: string;
    let senha: string | null = null;
    let emissor: string | null = null;
    let validoAte: string | null = null;
    let arquivoPath: string | null = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      nome = (formData.get('nome') as string) || file?.name || 'certificado';
      senha = formData.get('senha') as string || null;
      emissor = formData.get('emissor') as string || null;
      validoAte = formData.get('valido_ate') as string || null;

      if (file) {
        const ok = await ensureBucket();
        if (!ok) {
          return NextResponse.json({ error: 'Erro ao configurar storage' }, { status: 500 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = `certificados/${Date.now()}-${file.name}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from(BUCKET_NAME)
          .upload(fileName, buffer, {
            contentType: file.type || 'application/x-pkcs12',
            upsert: false,
          });

        if (uploadError) {
          console.error('Erro ao fazer upload do certificado:', uploadError);
          return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 });
        }

        arquivoPath = fileName;
      }
    } else {
      const body = await request.json();
      nome = body.nome;
      senha = body.senha || null;
      emissor = body.emissor || null;
      validoAte = body.valido_ate || null;
      arquivoPath = body.arquivo_path || null;
    }

    if (!nome) {
      return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });
    }

    const senhaCriptografada = senha ? encryptPassword(senha) : null;

    const { data, error } = await supabaseAdmin
      .from('esocial_certificados')
      .insert({
        nome,
        senha_criptografada: senhaCriptografada,
        emissor: emissor || null,
        valido_ate: validoAte || null,
        arquivo_path: arquivoPath || null,
        ativo: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar certificado:', error);
      return NextResponse.json({ error: 'Erro ao criar certificado' }, { status: 500 });
    }

    return NextResponse.json({ success: true, certificado: data }, { status: 201 });
  } catch (error) {
    console.error('Erro em POST /api/e-social/certificados:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const { data: cert, error: fetchError } = await supabaseAdmin
      .from('esocial_certificados')
      .select('arquivo_path')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !cert) {
      return NextResponse.json({ error: 'Certificado não encontrado' }, { status: 404 });
    }

    if (cert.arquivo_path) {
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([cert.arquivo_path]);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('esocial_certificados')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao deletar certificado:', deleteError);
      return NextResponse.json({ error: 'Erro ao deletar certificado' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Certificado removido' });
  } catch (error) {
    console.error('Erro em DELETE /api/e-social/certificados:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
