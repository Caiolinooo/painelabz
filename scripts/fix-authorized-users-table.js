// Script para criar a tabela authorized_users no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const databaseUrl = process.env.DATABASE_URL;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
  console.error('Erro: Variáveis de ambiente não estão configuradas corretamente');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Definido' : 'Não definido');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Definido' : 'Não definido');
  console.error('DATABASE_URL:', databaseUrl ? 'Definido' : 'Não definido');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Criar pool de conexão PostgreSQL
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para criar a tabela authorized_users
async function createAuthorizedUsersTable() {
  console.log('Criando tabela authorized_users...');

  try {
    // Verificar se a tabela já existe
    const { rows: existingTables } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'authorized_users'
    `);

    if (existingTables.length > 0) {
      console.log('A tabela authorized_users já existe. Pulando criação.');
      return;
    }

    // Criar a tabela authorized_users
    await pool.query(`
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
    `);

    console.log('Tabela authorized_users criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela authorized_users:', error);
  }
}

// Função principal
async function main() {
  try {
    // Testar conexão com o Supabase
    console.log('Testando conexão com o Supabase...');
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
      console.error('Erro ao conectar com o Supabase:', error);
      process.exit(1);
    }

    console.log('Conexão com o Supabase estabelecida com sucesso!');

    // Criar tabela authorized_users
    await createAuthorizedUsersTable();

    console.log('Script concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao executar script:', error);
  } finally {
    // Fechar conexão com o PostgreSQL
    await pool.end();
  }
}

// Executar script
main();
