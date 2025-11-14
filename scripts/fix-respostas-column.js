/**
 * Script para adicionar coluna respostas via API do Supabase
 * Execute: node scripts/fix-respostas-column.js
 */

const https = require('https');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseKey = ***REMOVED***;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const sql = `
DO $$
BEGIN
    -- Adicionar coluna respostas se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'avaliacoes_desempenho' 
        AND column_name = 'respostas'
    ) THEN
        ALTER TABLE avaliacoes_desempenho
        ADD COLUMN respostas JSONB DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Coluna respostas adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna respostas já existe';
    END IF;

    -- Criar índice se não existir
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_avaliacoes_respostas'
    ) THEN
        CREATE INDEX idx_avaliacoes_respostas 
        ON avaliacoes_desempenho USING GIN (respostas);
        
        RAISE NOTICE 'Índice criado com sucesso';
    ELSE
        RAISE NOTICE 'Índice já existe';
    END IF;
END $$;
`;

console.log('🔧 Executando migration...\n');
console.log('📝 SQL:');
console.log(sql);
console.log('\n⚠️  Execute este SQL no Supabase SQL Editor:');
console.log('1. Acesse: https://supabase.com/dashboard');
console.log('2. Selecione seu projeto');
console.log('3. Vá em SQL Editor');
console.log('4. Cole e execute o SQL acima');
console.log('\n✅ Após executar, o sistema funcionará corretamente\n');
