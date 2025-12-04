/**
 * Execute migration step-by-step using Supabase raw queries
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

async function runSQL(description, sql) {
    console.log(`🔧 ${description}...`);
    try {
        // Use PostgreSQL REST API to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.log(`   ❌ Erro: ${error.message}`);
            return false;
        }
        console.log(`   ✅ Sucesso`);
        return true;
    } catch (err) {
        console.log(`   ❌ Exceção: ${err.message}`);
        return false;
    }
}

async function checkColumn(columnName) {
    const { data } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);

    if (data && data.length > 0) {
        return Object.keys(data[0]).includes(columnName);
    }

    // If no data, try to insert and check
    return false;
}

async function stepByStepMigration() {
    console.log('\n🔄 Executando migração passo a passo...\n');

    // Step 1: Check current state
    console.log('📊 Estado atual:');
    const hasRead = await checkColumn('read');
    const hasReadAt = await checkColumn('read_at');
    console.log(`   read (BOOLEAN): ${hasRead ? 'existe' : 'não existe'}`);
    console.log(`   read_at (TIMESTAMP): ${hasReadAt ? 'existe' : 'não existe'}`);
    console.log('');

    if (hasReadAt && !hasRead) {
        console.log('✅ Migração já foi aplicada!\n');
        return true;
    }

    // Since exec_sql isn't available, we'll create a comprehensive guide
    console.log('⚠️  Migração automática não disponível via API');
    console.log('   Será necessário executar manualmente via Supabase Dashboard\n');

    console.log('═'.repeat(80));
    console.log('INSTRUÇÕES DETALHADAS PARA MIGRAÇÃO MANUAL');
    console.log('═'.repeat(80));
    console.log('');
    console.log('1. Acesse: https://supabase.com/dashboard');
    console.log('2. Selecione seu projeto');
    console.log('3. No menu lateral, clique em "SQL Editor"');
    console.log('4. Clique em "+ New query"');
    console.log('5. Cole o SQL abaixo e clique em "RUN"');
    console.log('');
    console.log('─'.repeat(80));

    const migrationSQL = `
-- Migration: Fix notifications table schema
-- Replace 'read' BOOLEAN with 'read_at' TIMESTAMP

-- Step 1: Add read_at column if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Migrate existing data
-- If notification was marked as read, set read_at to created_at
UPDATE notifications 
SET read_at = created_at 
WHERE read = TRUE AND read_at IS NULL;

-- Step 3: Drop old 'read' column
ALTER TABLE notifications 
DROP COLUMN IF EXISTS read;

-- Step 4: Add other required columns if missing
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' NOT NULL;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_read_at 
ON notifications(read_at) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_priority 
ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notifications_expires_at 
ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
`.trim();

    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('');
    console.log('6. Aguarde a execução');
    console.log('7. Verifique se não há erros');
    console.log('8. Execute: node scripts/verify-notifications-rls.js para confirmar');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');

    // Also save to a file for easy access
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '..', 'MIGRATION_MANUAL.sql');
    fs.writeFileSync(outputPath, migrationSQL);
    console.log(`📄 SQL salvo em: ${outputPath}`);
    console.log('   Você pode copiar diretamente deste arquivo\n');

    return false;
}

stepByStepMigration()
    .then(success => {
        if (success) {
            console.log('🎉 Migração concluída!\n');
            process.exit(0);
        } else {
            console.log('⏸️  Aguardando aplicação manual da migração\n');
            console.log('Próximos passos após aplicar a migração:');
            console.log('   1. node scripts/verify-notifications-rls.js');
            console.log('   2. node scripts/create-test-notifications.js <user_id>\n');
            process.exit(0); // Exit 0 because manual migration is expected
        }
    })
    .catch(error => {
        console.error('❌ Erro:', error);
        process.exit(1);
    });
