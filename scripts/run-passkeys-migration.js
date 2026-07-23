const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key in environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
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
  `;

    console.log('Executing SQL migration...');

    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('RPC Error, trying with another name "execute_sql":', error);
            const { error: err2 } = await supabase.rpc('execute_sql', { sql_query: sql });
            if (err2) {
                console.error('Both RPCs failed:', err2);
                console.log('\\nIf you do not have an executed_sql or exec_sql function, please run this SQL manually in the Supabase SQL Editor.');
            } else {
                console.log('Migration successful using execute_sql.');
            }
        } else {
            console.log('Migration successful using exec_sql.');
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

run();
