import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Buscar service key da tabela app_secrets
async function getServiceKeyFromDB() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const tempClient = createClient(supabaseUrl, anonKey);

  try {
    const { data, error } = await tempClient
      .from('app_secrets')
      .select('value')
      .or('key.eq.SUPABASE_SERVICE_ROLE_KEY,key.eq.SUPABASE_SERVICE_KEY')
      .single();

    if (error || !data) {
      console.error('Erro ao buscar service key do BD:', error);
      return null;
    }

    return data.value;
  } catch (e) {
    console.error('Exceção ao buscar service key:', e);
    return null;
  }
}

// Inicializar cliente Supabase com service role key
async function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  // Se não tiver nas env vars, buscar do banco
  if (!supabaseServiceKey) {
    console.log('[UPLOAD] Service key não encontrada em env vars, buscando do BD...');
    supabaseServiceKey = await getServiceKeyFromDB();
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(`Configuração do Supabase ausente. URL: ${!!supabaseUrl}, Service Key: ${!!supabaseServiceKey}`);
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// POST - Upload de mídias de notícias para o Supabase Storage (bucket 'news')
export async function POST(request: NextRequest) {
  const debugLogs: string[] = [];

  try {
    debugLogs.push('📥 Recebendo requisição de upload...');
    console.log('📥 [NEWS UPLOAD] Recebendo requisição de upload...');

    // Inicializar cliente Supabase Admin
    debugLogs.push('🔧 Inicializando cliente Supabase Admin...');
    const supabaseAdmin = await getSupabaseAdmin();
    debugLogs.push('✅ Cliente Supabase Admin inicializado');

    const formData = await request.formData();

    // Coletar arquivos (aceita chaves 'file' e 'files')
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const fileInfo = `${value.name} (${(value.size / 1024).toFixed(2)} KB, tipo: ${value.type})`;
        debugLogs.push(`📎 Arquivo encontrado: ${fileInfo}`);
        console.log(`📎 [NEWS UPLOAD] Arquivo encontrado: ${fileInfo}`);
        files.push(value);
      }
    }

    if (files.length === 0) {
      debugLogs.push('❌ Nenhum arquivo foi enviado');
      console.error('❌ [NEWS UPLOAD] Nenhum arquivo foi enviado');
      return NextResponse.json({
        error: 'Nenhum arquivo enviado',
        debugLogs
      }, { status: 400 });
    }

    debugLogs.push(`✅ ${files.length} arquivo(s) recebido(s)`);
    console.log(`✅ [NEWS UPLOAD] ${files.length} arquivo(s) recebido(s)`);

    // Pasta opcional
    const folder = (formData.get('folder') as string) || 'posts';
    debugLogs.push(`📁 Pasta de destino: ${folder}`);
    console.log(`📁 [NEWS UPLOAD] Pasta de destino: ${folder}`);

    // Não precisa criar bucket, já existe

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
        debugLogs.push('❌ ERRO no Supabase Storage');
        debugLogs.push(`   Mensagem: ${error.message}`);
        debugLogs.push(`   Status: ${error.statusCode || 'N/A'}`);
        debugLogs.push(`   Nome: ${error.name || 'N/A'}`);
        debugLogs.push(`   Arquivo: ${file.name}`);
        debugLogs.push(`   Caminho: ${filePath}`);
        debugLogs.push(`   Tipo: ${file.type}`);
        debugLogs.push(`   Tamanho: ${file.size} bytes`);

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
          error: 'Erro ao fazer upload para o Supabase Storage',
          details: error.message,
          errorName: error.name,
          statusCode: error.statusCode,
          file: file.name,
          path: filePath,
          debugLogs,
          supabaseError: {
            message: error.message,
            name: error.name,
            statusCode: error.statusCode,
            error: error.error
          }
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

    debugLogs.push(`🎉 Upload completo! ${uploaded.length} arquivo(s) enviado(s)`);
    console.log(`🎉 [NEWS UPLOAD] Upload completo! ${uploaded.length} arquivo(s) enviado(s)`);

    return NextResponse.json({
      success: true,
      files: uploaded,
      debugLogs
    });
  } catch (error) {
    debugLogs.push('💥 ERRO CRÍTICO não capturado');
    debugLogs.push(`   Tipo: ${error instanceof Error ? error.constructor.name : typeof error}`);
    debugLogs.push(`   Mensagem: ${error instanceof Error ? error.message : String(error)}`);

    console.error('💥 [NEWS UPLOAD] ERRO CRÍTICO não capturado:');
    console.error('   Tipo:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('   Objeto completo:', error);

    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      debugLogs
    }, { status: 500 });
  }
}

