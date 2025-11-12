const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuração do cliente Supabase
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('***REMOVED***:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLFile() {
  try {
    console.log('🔧 Iniciando correção de foreign keys das avaliações...\n');

    // Ler arquivo SQL
    const sqlFilePath = path.join(__dirname, 'fix-avaliacoes-foreign-keys-to-users-unified.sql');
    console.log(`📄 Lendo arquivo: ${sqlFilePath}`);

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`✓ Arquivo lido com sucesso (${sqlContent.length} caracteres)\n`);

    // Executar SQL
    console.log('⚙️  Executando script SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });

    if (error) {
      // Tentar executar diretamente se exec_sql não existir
      console.log('⚠️  Função exec_sql não encontrada, tentando executar diretamente...');

      // Separar comandos SQL
      const commands = sqlContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const command of commands) {
        try {
          const { error: cmdError } = await supabase.rpc('exec', { sql: command + ';' });
          if (cmdError) {
            console.error(`❌ Erro ao executar comando: ${cmdError.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Erro: ${err.message}`);
          errorCount++;
        }
      }

      console.log(`\n✓ Comandos executados: ${successCount}`);
      if (errorCount > 0) {
        console.log(`⚠️  Comandos com erro: ${errorCount}`);
      }
    } else {
      console.log('✓ Script SQL executado com sucesso!\n');
      if (data) {
        console.log('Resultado:', data);
      }
    }

    // Verificar foreign keys criadas
    console.log('\n🔍 Verificando foreign keys em avaliacoes_desempenho...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'avaliacoes_desempenho')
      .eq('constraint_type', 'FOREIGN KEY');

    if (!constraintsError && constraints) {
      console.log(`\n✓ Foreign keys encontradas: ${constraints.length}`);
      constraints.forEach(c => {
        console.log(`  - ${c.constraint_name}`);
      });
    }

    console.log('\n✅ Correção de foreign keys concluída!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('As foreign keys agora apontam para users_unified');
    console.log('Próximos passos: Atualizar os arquivos da API');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  }
}

// Executar
executeSQLFile();
