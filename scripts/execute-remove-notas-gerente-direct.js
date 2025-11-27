const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas');
  console.error('   Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  try {
    console.log('\n🚀 Iniciando migration: Remover coluna notas_gerente');
    console.log('=' .repeat(60));

    console.log('\n📋 Etapa 1: Criar tabela de backup');
    console.log('   Verificando se há registros com notas_gerente...');

    // Verificar se a coluna existe e tem dados
    const { data: existingData, error: checkError } = await supabase
      .from('avaliacoes_desempenho')
      .select('id, notas_gerente, updated_at')
      .not('notas_gerente', 'is', null)
      .limit(5);

    if (checkError) {
      // Se der erro, pode ser que a coluna já foi removida
      if (checkError.message.includes('notas_gerente')) {
        console.log('✅ Coluna notas_gerente já foi removida anteriormente');
        console.log('\n🎉 Sistema já está atualizado!\n');
        return;
      }
      throw checkError;
    }

    const recordCount = existingData?.length || 0;
    console.log(`   Encontrados ${recordCount} registros com notas_gerente`);

    if (recordCount > 0) {
      console.log('\n   ⚠️  ATENÇÃO: Existem avaliações com notas_gerente');
      console.log('   Estas notas serão preservadas na tabela de backup');
      console.log('   Tabela: avaliacoes_desempenho_backup_notas_gerente');
    }

    console.log('\n📋 Etapa 2: Executar migration via SQL Editor');
    console.log('   Path: supabase/migrations/20251125_remove_notas_gerente.sql');
    console.log('\n   Como executar manualmente:');
    console.log('   1. Abra o Supabase Dashboard');
    console.log('   2. Vá em SQL Editor');
    console.log('   3. Copie e cole o conteúdo do arquivo de migration');
    console.log('   4. Execute a query');

    console.log('\n💡 Dica: A migration inclui:');
    console.log('   ✅ Backup automático de registros com notas_gerente');
    console.log('   ✅ Remoção segura da coluna');
    console.log('   ✅ Comentários e logs de execução');

    console.log('\n⚠️  Migration deve ser executada manualmente no Supabase Dashboard');
    console.log('   Motivo: Supabase PostgREST API não suporta DDL (ALTER TABLE)');
    console.log('   Apenas o SQL Editor tem permissão para executar ALTER TABLE');

    // Mostrar conteúdo da migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251125_remove_notas_gerente.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Conteúdo da Migration:');
    console.log('=' .repeat(60));
    console.log(migrationSQL);
    console.log('=' .repeat(60));

    console.log('\n✅ Script concluído!');
    console.log('   Próximo passo: Execute a migration manualmente no Supabase Dashboard\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('\n💡 Execute a migration manualmente no Supabase Dashboard');
    console.error(`   Path: supabase/migrations/20251125_remove_notas_gerente.sql\n`);
    process.exit(1);
  }
}

executeMigration();
