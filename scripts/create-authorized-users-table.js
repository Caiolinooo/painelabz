// Script para criar a tabela authorized_users no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAuthorizedUsersTable() {
  console.log('Criando tabela authorized_users...');

  try {
    // Verificar se a tabela já existe
    const { data: existingTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'authorized_users');

    if (tablesError) {
      console.error('Erro ao verificar tabelas existentes:', tablesError);
      return;
    }

    if (existingTables && existingTables.length > 0) {
      console.log('A tabela authorized_users já existe. Pulando criação.');
      return;
    }

    // Criar a tabela authorized_users
    const { error: createError } = await supabase.rpc('create_authorized_users_table');

    if (createError) {
      console.error('Erro ao criar tabela authorized_users:', createError);
      
      // Tentar criar a tabela usando SQL direto
      console.log('Tentando criar tabela usando SQL direto...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS authorized_users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email TEXT UNIQUE,
          phone_number TEXT UNIQUE,
          domain TEXT,
          invite_code TEXT UNIQUE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected', 'expired')),
          expires_at TIMESTAMP WITH TIME ZONE,
          max_uses INTEGER,
          uses INTEGER NOT NULL DEFAULT 0,
          created_by UUID REFERENCES users(id),
          updated_by UUID,
          notes JSONB,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
        CREATE INDEX IF NOT EXISTS idx_authorized_users_phone ON authorized_users(phone_number);
        CREATE INDEX IF NOT EXISTS idx_authorized_users_domain ON authorized_users(domain);
        CREATE INDEX IF NOT EXISTS idx_authorized_users_invite_code ON authorized_users(invite_code);
        CREATE INDEX IF NOT EXISTS idx_authorized_users_status ON authorized_users(status);
      `;
      
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (sqlError) {
        console.error('Erro ao criar tabela usando SQL direto:', sqlError);
        return;
      }
    }

    console.log('Tabela authorized_users criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela authorized_users:', error);
  }
}

async function main() {
  try {
    await createAuthorizedUsersTable();
    console.log('Script concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao executar script:', error);
  }
}

main();
