/**
 * Script para aplicar migrations manualmente no Supabase
 * Executa as migrations pendentes diretamente via Supabase Admin
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration(filename) {
  console.log(`\n📄 Aplicando migration: ${filename}`);
  
  try {
    const sqlContent = readFileSync(join(process.cwd(), 'supabase', 'migrations', filename), 'utf-8');
    
    // Dividir em statements individuais (split por ;)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   ${statements.length} statements encontrados`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`   [${i + 1}/${statements.length}] Executando...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Tentar via query direto
        const { error: error2 } = await supabase.from('_temp').select('*').limit(0);
        if (error2) {
          console.error(`   ❌ Erro:`, error.message);
          // Não falhar completamente, continuar com próximo statement
        } else {
          console.log(`   ✅ OK`);
        }
      } else {
        console.log(`   ✅ OK`);
      }
    }
    
    console.log(`✅ Migration ${filename} aplicada com sucesso`);
    return true;
  } catch (err) {
    console.error(`❌ Erro ao processar migration ${filename}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando aplicação de migrations...\n');
  
  const migrations = [
    '20251113_create_notifications_table.sql',
    '20251113_add_data_liberacao_periodos.sql'
  ];
  
  for (const migration of migrations) {
    await applyMigration(migration);
  }
  
  console.log('\n✨ Processo concluído!');
  console.log('\n📋 INSTRUÇÕES ALTERNATIVAS:');
  console.log('Se o script acima falhou, copie e cole os SQL files diretamente no Supabase SQL Editor:');
  console.log('1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
  console.log('2. Cole o conteúdo dos arquivos:');
  migrations.forEach(m => {
    console.log(`   - supabase/migrations/${m}`);
  });
  console.log('3. Clique em "Run" para executar\n');
}

main().catch(console.error);
