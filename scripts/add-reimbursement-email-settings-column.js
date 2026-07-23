/**
 * Script para adicionar a coluna reimbursement_email_settings à tabela users_unified
 */

const { supabaseAdmin } = require('../src/lib/supabase');

async function addReimbursementEmailSettingsColumn() {
  try {
    console.log('Iniciando adição da coluna reimbursement_email_settings à tabela users_unified...');

    // Verificar se a coluna já existe
    try {
      const { data, error } = await supabaseAdmin
        .from('users_unified')
        .select('reimbursement_email_settings')
        .limit(1);
      
      if (!error) {
        console.log('Coluna reimbursement_email_settings já existe na tabela users_unified');
        return true;
      }
      
      // Se o erro não for relacionado à coluna não existente, retornar erro
      if (error.code !== '42703') {
        console.error('Erro ao verificar coluna:', error);
        return false;
      }
      
      console.log('Coluna reimbursement_email_settings não existe, adicionando...');
    } catch (checkError) {
      console.error('Erro ao verificar coluna:', checkError);
    }

    // Tentar adicionar a coluna usando SQL direto
    try {
      // Método 1: Usar a API REST do Supabase para executar SQL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Variáveis de ambiente do Supabase não definidas');
        return false;
      }
      
      // Tentar executar SQL via API REST
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          query: `ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS reimbursement_email_settings JSONB;`
        })
      });
      
      if (response.ok) {
        console.log('Coluna adicionada com sucesso via API REST');
        
        // Criar índice para melhorar performance
        const indexResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            query: `CREATE INDEX IF NOT EXISTS idx_users_unified_reimbursement_email_settings ON users_unified USING GIN (reimbursement_email_settings);`
          })
        });
        
        if (indexResponse.ok) {
          console.log('Índice criado com sucesso');
        } else {
          console.error('Erro ao criar índice:', await indexResponse.text());
          // Não retornar erro aqui, pois o índice é opcional
        }
        
        return true;
      } else {
        console.error('Erro ao executar SQL via API REST:', await response.text());
      }
    } catch (sqlError) {
      console.error('Erro ao executar SQL:', sqlError);
    }

    // Método 2: Tentar usar o SQL Editor do Supabase
    console.log(`
      A coluna não pôde ser adicionada automaticamente.
      Por favor, execute o seguinte SQL no SQL Editor do Supabase:
      
      ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS reimbursement_email_settings JSONB;
      CREATE INDEX IF NOT EXISTS idx_users_unified_reimbursement_email_settings ON users_unified USING GIN (reimbursement_email_settings);
    `);

    return false;
  } catch (error) {
    console.error('Erro ao adicionar coluna:', error);
    return false;
  }
}

// Executar a função principal
addReimbursementEmailSettingsColumn()
  .then(success => {
    if (success) {
      console.log('Coluna reimbursement_email_settings adicionada com sucesso à tabela users_unified!');
    } else {
      console.error('Falha ao adicionar coluna reimbursement_email_settings à tabela users_unified.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
