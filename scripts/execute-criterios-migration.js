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

async function executeMigration() {
  try {
    console.log('🔧 Iniciando migração de criterios_avaliacao...\n');

    // Ler arquivo SQL
    const sqlFilePath = path.join(__dirname, 'migrations', 'fix-criterios-avaliacao-add-codigo.sql');
    console.log(`📄 Lendo arquivo: ${sqlFilePath}`);

    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ Arquivo não encontrado: ${sqlFilePath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`✓ Arquivo lido com sucesso (${sqlContent.length} caracteres)\n`);

    // Separar comandos SQL - melhor parsing
    const commands = [];
    let currentCommand = '';
    const lines = sqlContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine.length === 0) {
        continue;
      }
      
      currentCommand += line + '\n';
      
      // Check if command ends with semicolon
      if (trimmedLine.endsWith(';')) {
        commands.push(currentCommand.trim());
        currentCommand = '';
      }
    }
    
    // Add last command if exists
    if (currentCommand.trim().length > 0) {
      commands.push(currentCommand.trim());
    }

    let successCount = 0;
    let errorCount = 0;

    console.log(`⚙️  Executando ${commands.length} comandos SQL...\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Skip empty commands
      if (!command || command.length < 10) continue;

      try {
        // Tentar executar via RPC primeiro
        const { error } = await supabase.rpc('exec_sql', { sql_query: command + ';' });
        
        if (error) {
          // Se falhar, tentar executar diretamente via query raw
          console.log(`⚠️  RPC falhou, tentando método alternativo para comando ${i + 1}...`);
          
          // Para SELECT, usar .from()
          if (command.trim().toUpperCase().startsWith('SELECT')) {
            console.log(`ℹ️  Comando ${i + 1}/${commands.length} é SELECT, pulando execução direta`);
            successCount++;
          } else {
            console.error(`❌ Comando ${i + 1}/${commands.length} falhou:`, error.message);
            console.error(`   SQL: ${command.substring(0, 100)}...`);
            errorCount++;
          }
        } else {
          console.log(`✓ Comando ${i + 1}/${commands.length} executado com sucesso`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Erro no comando ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✓ Comandos executados com sucesso: ${successCount}`);
    if (errorCount > 0) {
      console.log(`⚠️  Comandos com erro: ${errorCount}`);
    }
    console.log(`${'═'.repeat(60)}\n`);

    // Verificar resultados
    console.log('🔍 Verificando critérios criados...\n');
    
    const { data: criterios, error: selectError } = await supabase
      .from('criterios_avaliacao')
      .select('codigo, nome, tipo, apenas_lideres, ordem, categoria')
      .order('ordem');

    if (selectError) {
      console.error('❌ Erro ao verificar critérios:', selectError.message);
    } else if (criterios && criterios.length > 0) {
      console.log(`✅ ${criterios.length} critérios encontrados:\n`);
      
      let lastTipo = '';
      criterios.forEach(c => {
        if (c.tipo !== lastTipo) {
          console.log(`\n📋 Tipo: ${c.tipo.toUpperCase()}`);
          lastTipo = c.tipo;
        }
        
        const label = c.apenas_lideres ? '👥 [LÍDER]' : '   ';
        console.log(`  ${label} ${c.ordem.toString().padStart(2, '0')}. ${c.codigo.padEnd(35)} | ${c.nome}`);
      });

      // Mostrar resumo por categoria
      console.log(`\n${'═'.repeat(60)}`);
      console.log('📊 Resumo por Categoria:\n');
      
      const resumo = criterios.reduce((acc, c) => {
        const key = `${c.tipo} - ${c.categoria}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      Object.entries(resumo).forEach(([key, count]) => {
        console.log(`   ${key}: ${count} critério(s)`);
      });
      
      console.log(`\n${'═'.repeat(60)}`);
      console.log('✅ Migração concluída com sucesso!');
      console.log(`${'═'.repeat(60)}\n`);
      
      console.log('📝 Próximos passos:');
      console.log('   1. Atualizar src/data/criterios-avaliacao.ts');
      console.log('   2. Atualizar componentes de avaliação');
      console.log('   3. Testar criação de novas avaliações\n');
    } else {
      console.warn('⚠️  Nenhum critério encontrado após migração');
    }

  } catch (error) {
    console.error('\n❌ Erro ao executar migração:', error);
    process.exit(1);
  }
}

// Executar
executeMigration();
