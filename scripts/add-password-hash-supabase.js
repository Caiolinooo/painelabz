const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Verificar se as variáveis de ambiente necessárias estão definidas
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Erro: As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidas.');
  process.exit(1);
}

// Criar cliente Supabase com a chave de serviço
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function addPasswordHashColumn() {
  try {
    console.log('Adicionando coluna password_hash à tabela users_unified...');

    // Executar SQL para adicionar a coluna
    const { error } = await supabase.rpc('execute_sql', {
      query: `
        -- Verificar se a coluna password_hash já existe
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users_unified'
                AND column_name = 'password_hash'
            ) THEN
                -- Adicionar a coluna password_hash
                ALTER TABLE users_unified ADD COLUMN password_hash TEXT;
                
                -- Copiar os valores da coluna password para password_hash
                UPDATE users_unified SET password_hash = password WHERE password IS NOT NULL;
            END IF;
        END $$;

        -- Criar índice para melhorar a performance
        CREATE INDEX IF NOT EXISTS idx_users_unified_password_hash ON users_unified(password_hash);
      `
    });

    if (error) {
      throw new Error(`Erro ao executar SQL: ${error.message}`);
    }

    console.log('Coluna password_hash adicionada com sucesso!');
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

// Executar a função
addPasswordHashColumn()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
