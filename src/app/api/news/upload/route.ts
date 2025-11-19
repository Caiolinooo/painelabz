import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Upload de mídias de notícias para o Supabase Storage (bucket 'news')
export async function POST(request: NextRequest) {
  try {
    console.log('📥 [NEWS UPLOAD] Recebendo requisição de upload...');
    const formData = await request.formData();

    // Coletar arquivos (aceita chaves 'file' e 'files')
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`📎 [NEWS UPLOAD] Arquivo encontrado: ${value.name} (${(value.size / 1024).toFixed(2)} KB, tipo: ${value.type})`);
        files.push(value);
      }
    }

    if (files.length === 0) {
      console.error('❌ [NEWS UPLOAD] Nenhum arquivo foi enviado');
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    console.log(`✅ [NEWS UPLOAD] ${files.length} arquivo(s) recebido(s)`);

    // Pasta opcional
    const folder = (formData.get('folder') as string) || 'posts';
    console.log(`📁 [NEWS UPLOAD] Pasta de destino: ${folder}`);

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

      console.log(`⬆️ [NEWS UPLOAD] Preparando upload: ${file.name} -> ${filePath}`);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`📦 [NEWS UPLOAD] Buffer criado: ${buffer.length} bytes`);
      console.log(`🔧 [NEWS UPLOAD] Tentando upload para bucket 'news'...`);

      const { data, error } = await supabaseAdmin.storage.from('news').upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

      if (error) {
        console.error('❌ [NEWS UPLOAD] ERRO no Supabase Storage:');
        console.error('   Mensagem:', error.message);
        console.error('   Status:', error.statusCode);
        console.error('   Nome:', error.name);
        console.error('   Objeto completo:', JSON.stringify(error, null, 2));
        console.error('   Arquivo:', file.name);
        console.error('   Caminho:', filePath);
        console.error('   Tipo:', file.type);
        console.error('   Tamanho:', file.size);

        return NextResponse.json({
          error: 'Erro ao fazer upload',
          details: error.message,
          supabaseError: error
        }, { status: 500 });
      }

      console.log(`✅ [NEWS UPLOAD] Upload bem-sucedido para: ${data.path}`);

      const { data: publicUrlData } = supabaseAdmin.storage.from('news').getPublicUrl(data.path);

      console.log(`🔗 [NEWS UPLOAD] URL pública gerada: ${publicUrlData.publicUrl}`);

      uploaded.push({
        originalName: file.name,
        path: data.path,
        url: publicUrlData.publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    console.log(`🎉 [NEWS UPLOAD] Upload completo! ${uploaded.length} arquivo(s) enviado(s)`);
    return NextResponse.json({ success: true, files: uploaded });
  } catch (error) {
    console.error('💥 [NEWS UPLOAD] ERRO CRÍTICO não capturado:');
    console.error('   Tipo:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('   Objeto completo:', error);

    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 });
  }
}

