/**
 * Script para adicionar coluna respostas na tabela avaliacoes_desempenho
 * Execute: node scripts/add-respostas-column.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = ***REMOVED***;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseKey);

async function addRespostasColumn() {
  console.log('🔧 Adicionando coluna respostas...\n');

  try {
    // Executar SQL via RPC (se disponível) ou diretamente
    const sql = `
      -- Adicionar coluna respostas se não existir
      ALTER TABLE avaliacoes_desempenho
      ADD COLUMN IF NOT EXISTS respostas JSONB DEFAULT '{}'::jsonb;

      -- Adicionar índice GIN para melhor performance
      CREATE INDEX IF NOT EXISTS idx_avaliacoes_respostas 
      ON avaliacoes_desempenho USING GIN (respostas);
    `;

    console.log('📝 SQL a ser executado:');
    console.log(sql);
    console.log('\n⚠️  IMPORTANTE: Execute este SQL manualmente no Supabase SQL Editor\n');
    console.log('1. Acesse: https://supabase.com/dashboard');
    console.log('2. Selecione seu projeto');
    console.log('3. Vá em SQL Editor');
    console.log('4. Cole e execute o SQL acima');
    console.log('\n✅ Após executar, teste o sistema novamente\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

addRespostasColumn();
