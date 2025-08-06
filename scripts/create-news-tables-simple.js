const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const supabaseUrl = ***REMOVED*** || 'https://arzvingdtnttiejcvucs.supabase.co';
const supabaseKey = ***REMOVED*** || '***REMOVED***';

const supabase = ***REMOVED*** supabaseKey);

async function createNewsTables() {
  try {
    console.log('🚀 Verificando tabelas do sistema de notícias...');

    const tablesToCheck = [
      'news_categories',
      'news_posts',
      'news_post_likes',
      'news_post_comments',
      'news_post_views',
      'notifications',
      'acl_permissions',
      'user_acl_permissions',
      'role_acl_permissions',
      'reminders'
    ];

    const existingTables = [];
    const missingTables = [];

    for (const tableName of tablesToCheck) {
      console.log(`\n🔍 Verificando tabela ${tableName}...`);
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.code === 'PGRST116') {
          console.log(`❌ Tabela ${tableName} não existe`);
          missingTables.push(tableName);
        } else if (error) {
          console.log(`⚠️  Tabela ${tableName}: ${error.message}`);
          missingTables.push(tableName);
        } else {
          console.log(`✅ Tabela ${tableName} existe`);
          existingTables.push(tableName);

          // Se for uma tabela com dados, mostrar quantos registros tem
          if (data && Array.isArray(data)) {
            const { count } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            console.log(`   📊 Registros: ${count || 0}`);
          }
        }
      } catch (e) {
        console.log(`❌ Tabela ${tableName} não existe (erro: ${e.message})`);
        missingTables.push(tableName);
      }
    }

    console.log('\n📊 RESUMO:');
    console.log(`✅ Tabelas existentes: ${existingTables.length}`);
    console.log(`❌ Tabelas faltando: ${missingTables.length}`);

    if (existingTables.length > 0) {
      console.log('\n✅ Tabelas que já existem:');
      existingTables.forEach(table => console.log(`   - ${table}`));
    }

    if (missingTables.length > 0) {
      console.log('\n❌ Tabelas que precisam ser criadas:');
      missingTables.forEach(table => console.log(`   - ${table}`));

      console.log('\n📋 INSTRUÇÕES PARA CRIAR AS TABELAS FALTANDO:');
      console.log('1. Acesse o painel do Supabase: https://supabase.com/dashboard');
      console.log('2. Vá para o projeto: arzvingdtnttiejcvucs');
      console.log('3. Clique em "SQL Editor" no menu lateral');
      console.log('4. Cole e execute o conteúdo do arquivo: scripts/create-news-system-tables.sql');
      console.log('5. Execute este script novamente para verificar se as tabelas foram criadas');

      console.log('\n🔗 Link direto para o SQL Editor:');
      console.log('https://supabase.com/dashboard/project/arzvingdtnttiejcvucs/sql');
    } else {
      console.log('\n🎉 Todas as tabelas necessárias já existem!');
      console.log('✅ O sistema de notícias pode ser implementado');
    }

    console.log('\n⚠️  IMPORTANTE:');
    console.log('- As tabelas serão criadas com IF NOT EXISTS, então é seguro executar múltiplas vezes');
    console.log('- Não afetará dados existentes');
    console.log('- Todas as foreign keys referenciam tabelas existentes');

  } catch (error) {
    console.error('💥 Erro ao verificar tabelas:', error);
  }
}

// Executar a verificação
createNewsTables();
