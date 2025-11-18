#!/usr/bin/env node

/**
 * Script para configurar o Supabase Storage para o módulo de notícias
 *
 * Este script:
 * 1. Verifica se o bucket 'news' existe
 * 2. Cria o bucket se não existir
 * 3. Configura políticas de acesso público para leitura
 * 4. Testa upload e recuperação de imagens
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js'));

// Função para carregar variáveis de ambiente do arquivo .env.production
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.production');
  const envContent = ***REMOVED*** 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

const env = loadEnv();

// Configuração do Supabase
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || ***REMOVED***;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  console.error('   URL encontrada:', !!supabaseUrl);
  console.error('   Service Key encontrada:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupNewsStorage() {
  console.log('🚀 Iniciando configuração do Supabase Storage para News...\n');

  try {
    // 1. Verificar buckets existentes
    console.log('📋 Verificando buckets existentes...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      throw listError;
    }

    console.log(`✅ ${buckets.length} buckets encontrados`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'público' : 'privado'})`);
    });

    // 2. Verificar se o bucket 'news' existe
    const newsBucket = buckets.find(b => b.name === 'news');

    if (newsBucket) {
      console.log('\n✅ Bucket "news" já existe');
      console.log(`   - Público: ${newsBucket.public ? 'Sim' : 'Não'}`);

      // Atualizar para público se necessário
      if (!newsBucket.public) {
        console.log('📝 Atualizando bucket "news" para público...');
        const { error: updateError } = await supabase.storage.updateBucket('news', {
          public: true
        });

        if (updateError) {
          console.error('❌ Erro ao atualizar bucket:', updateError);
        } else {
          console.log('✅ Bucket "news" atualizado para público');
        }
      }
    } else {
      // 3. Criar o bucket 'news'
      console.log('\n📝 Criando bucket "news"...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('news', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/*', 'video/*']
      });

      if (createError) {
        console.error('❌ Erro ao criar bucket:', createError);
        throw createError;
      }

      console.log('✅ Bucket "news" criado com sucesso');
    }

    // 4. Configurar políticas de acesso (RLS)
    console.log('\n📝 Configurando políticas de acesso...');

    // Política para permitir leitura pública
    const policies = [
      {
        name: 'Public Access',
        description: 'Permitir leitura pública de arquivos no bucket news',
        sql: `
          CREATE POLICY IF NOT EXISTS "Public Access"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'news');
        `
      },
      {
        name: 'Authenticated Upload',
        description: 'Permitir upload de arquivos para usuários autenticados',
        sql: `
          CREATE POLICY IF NOT EXISTS "Authenticated Upload"
          ON storage.objects FOR INSERT
          WITH CHECK (
            bucket_id = 'news' AND
            auth.role() = 'authenticated'
          );
        `
      },
      {
        name: 'Authenticated Update',
        description: 'Permitir atualização de arquivos para usuários autenticados',
        sql: `
          CREATE POLICY IF NOT EXISTS "Authenticated Update"
          ON storage.objects FOR UPDATE
          USING (bucket_id = 'news' AND auth.role() = 'authenticated');
        `
      },
      {
        name: 'Authenticated Delete',
        description: 'Permitir exclusão de arquivos para usuários autenticados',
        sql: `
          CREATE POLICY IF NOT EXISTS "Authenticated Delete"
          ON storage.objects FOR DELETE
          USING (bucket_id = 'news' AND auth.role() = 'authenticated');
        `
      }
    ];

    console.log('   ℹ️  As políticas de acesso devem ser configuradas via Supabase Dashboard');
    console.log('   📍 Acesse: https://supabase.com/dashboard/project/_/storage/policies');
    console.log('\n   Políticas recomendadas:');
    policies.forEach(policy => {
      console.log(`\n   📌 ${policy.name}`);
      console.log(`      ${policy.description}`);
    });

    // 5. Testar upload de uma imagem de teste
    console.log('\n🧪 Testando upload de imagem...');

    // Criar uma imagem de teste simples (1x1 pixel PNG transparente)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    const testFileName = `test/test-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('news')
      .upload(testFileName, testImageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erro ao fazer upload de teste:', uploadError);
      throw uploadError;
    }

    console.log('✅ Upload de teste bem-sucedido');
    console.log(`   Caminho: ${uploadData.path}`);

    // 6. Testar recuperação da URL pública
    console.log('\n🔗 Testando URL pública...');
    const { data: publicUrlData } = supabase.storage
      .from('news')
      .getPublicUrl(uploadData.path);

    console.log('✅ URL pública gerada:');
    console.log(`   ${publicUrlData.publicUrl}`);

    // 7. Limpar arquivo de teste
    console.log('\n🧹 Limpando arquivo de teste...');
    const { error: deleteError } = await supabase.storage
      .from('news')
      .remove([testFileName]);

    if (deleteError) {
      console.warn('⚠️  Aviso: Não foi possível excluir o arquivo de teste:', deleteError);
    } else {
      console.log('✅ Arquivo de teste removido');
    }

    // 8. Verificar estrutura de pastas
    console.log('\n📁 Estrutura de pastas recomendada:');
    console.log('   /news');
    console.log('   ├── posts/        (posts regulares)');
    console.log('   ├── highlights/   (destaques)');
    console.log('   ├── events/       (eventos)');
    console.log('   └── test/         (arquivos de teste)');

    console.log('\n✅ Configuração do Supabase Storage concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Verifique as políticas de acesso no Supabase Dashboard');
    console.log('   2. Teste o upload de fotos na interface do usuário');
    console.log('   3. Verifique se as imagens estão sendo exibidas corretamente');

  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error);
    process.exit(1);
  }
}

// Executar o script
setupNewsStorage();
