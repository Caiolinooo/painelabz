import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configurações de validação
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// POST - Upload de mídias de notícias para o Supabase Storage (bucket 'news')
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Coletar arquivos (aceita chaves 'file' e 'files')
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar arquivos
    for (const file of files) {
      // Verificar tamanho
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          error: `Arquivo "${file.name}" excede o tamanho máximo de 50 MB`,
          details: `Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)} MB`
        }, { status: 400 });
      }

      // Verificar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({
          error: `Tipo de arquivo "${file.type}" não permitido`,
          details: 'Tipos permitidos: JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime',
          file: file.name
        }, { status: 400 });
      }
    }

    // Pasta opcional
    const folder = (formData.get('folder') as string) || 'posts';

    // Garantir que o bucket 'news' exista (ignorar erro se já existir)
    try {
      // createBucket falha se existir; podemos tentar e ignorar 'Bucket already exists'
      // Nota: Alguns ambientes bloqueiam createBucket com anon; ideal com service role
      // Este supabaseAdmin deve estar com service role
      // @ts-ignore
      await (supabaseAdmin as any).storage.createBucket('news', { public: true });
    } catch (e) {
      // ignore
    }

    const uploaded: Array<{ originalName: string; path: string; url: string; type: string; size: number }> = [];

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${uuidv4()}.${ext}`;
      const filePath = `${folder}/${fileName}`;

      console.log(`📤 Fazendo upload de "${file.name}" (${(file.size / 1024).toFixed(2)} KB) para ${filePath}`);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data, error } = await supabaseAdmin.storage.from('news').upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (error) {
        console.error('❌ Erro ao enviar para Supabase Storage:', error);
        console.error('   Arquivo:', file.name);
        console.error('   Caminho:', filePath);
        console.error('   Tipo:', file.type);
        console.error('   Tamanho:', file.size);

        // Retornar erro mais detalhado
        return NextResponse.json({
          error: 'Erro ao fazer upload para o Supabase Storage',
          details: error.message || 'Erro desconhecido',
          file: file.name,
          suggestion: 'Verifique se o bucket "news" está configurado corretamente e se as políticas de acesso estão ativas. Consulte: docs/NEWS_MODULE_SETUP.md'
        }, { status: 500 });
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from('news').getPublicUrl(data.path);

      console.log(`✅ Upload concluído: ${publicUrlData.publicUrl}`);

      uploaded.push({
        originalName: file.name,
        path: data.path,
        url: publicUrlData.publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    return NextResponse.json({ success: true, files: uploaded });
  } catch (error) {
    console.error('Erro em /api/news/upload:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

