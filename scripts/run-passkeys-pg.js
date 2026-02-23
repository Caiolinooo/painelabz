const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.log('No DATABASE_URL found!');
        process.exit(1);
    }
    const pool = new Pool({ connectionString });

    const sql = `
    -- Adicionar coluna para armazenar o challenge do WebAuthn temporariamente
    ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS webauthn_challenge TEXT;

    -- Criação da tabela de passkeys
    CREATE TABLE IF NOT EXISTS user_passkeys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        device_type TEXT NOT NULL,
        backed_up BOOLEAN NOT NULL DEFAULT false,
        transports TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Índices para melhorar leitura
    CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id ON user_passkeys(user_id);

    -- RLS
    ALTER TABLE user_passkeys ENABLE ROW LEVEL SECURITY;

    -- Primeiro, tenta dropar a policy caso exista para não dar erro
    DROP POLICY IF EXISTS "Users can manage their own passkeys" ON user_passkeys;
    
    CREATE POLICY "Users can manage their own passkeys" ON user_passkeys
        FOR ALL
        USING (user_id = auth.uid() OR auth.role() = 'service_role');

    -- Conceder permissões
    GRANT ALL ON TABLE user_passkeys TO authenticated;
    GRANT ALL ON TABLE user_passkeys TO service_role;
    GRANT ALL ON TABLE user_passkeys TO anon;
  `;

    try {
        console.log('Executing PG query for WebAuthn migration...');
        await pool.query(sql);
        console.log('Migration successful!');
        process.exit(0);
    } catch (err) {
        console.error('Error executing query:', err);
        process.exit(1);
    }
}

run();
