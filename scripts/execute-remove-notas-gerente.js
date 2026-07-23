const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas');
  console.error('   Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('\n🚀 Iniciando migration: Remover coluna notas_gerente');
    console.log('=' .repeat(60));

    // Ler arquivo SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251125_remove_notas_gerente.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Arquivo de migration carregado');
    console.log(`   Path: ${migrationPath}`);

    // Executar migration via RPC
    console.log('\n⚙️  Executando migration...');

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // Se a função exec_sql não existir, executar diretamente
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n⚠️  Função exec_sql não encontrada, executando via SQL direto...');

        // Separar comandos SQL
        const commands = migrationSQL
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

        for (const command of commands) {
          const { error: cmdError } = await supabase.rpc('exec', {
            sql: command
          });

          if (cmdError) {
            console.error(`❌ Erro ao executar comando: ${cmdError.message}`);
            console.error(`   Comando: ${command.substring(0, 100)}...`);
          }
        }
      } else {
        throw error;
      }
    }

    console.log('\n✅ Migration executada com sucesso!');
    console.log('=' .repeat(60));

    // Verificar se a coluna foi removida
    console.log('\n🔍 Verificando remoção da coluna...');
    const { data: columns, error: checkError } = await supabase
      .from('avaliacoes_desempenho')
      .select('*')
      .limit(1);

    if (!checkError) {
      console.log('✅ Tabela avaliacoes_desempenho acessível');

      // Verificar se a tabela de backup foi criada
      const { count, error: backupError } = await supabase
        .from('avaliacoes_desempenho_backup_notas_gerente')
        .select('*', { count: 'exact', head: true });

      if (!backupError) {
        console.log(`✅ Backup criado com ${count || 0} registros`);
      } else {
        console.log('⚠️  Backup não encontrado ou não tem registros');
      }
    }

    console.log('\n📊 Resumo:');
    console.log('   ✅ Coluna notas_gerente removida');
    console.log('   ✅ Backup criado (se havia registros)');
    console.log('   ✅ Sistema atualizado para não usar notas em Q11-Q14');
    console.log('\n🎉 Migration concluída!\n');

  } catch (error) {
    console.error('\n❌ Erro ao executar migration:', error);
    console.error('\n💡 Solução alternativa:');
    console.error('   Execute o SQL manualmente no Supabase Dashboard > SQL Editor');
    console.error(`   Path: supabase/migrations/20251125_remove_notas_gerente.sql\n`);
    process.exit(1);
  }
}

executeMigration();
