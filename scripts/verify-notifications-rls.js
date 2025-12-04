/**
 * Script to verify RLS (Row Level Security) policies on notifications table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente não configuradas');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRLSPolicies() {
    console.log('\n🔐 Verificando políticas RLS da tabela notifications...\n');

    try {
        // Test 1: Check if RLS is enabled
        console.log('1️⃣ Verificando se RLS está habilitado...');
        const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
            sql_query: `
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'notifications';
      `
        });

        if (rlsError) {
            console.log('   ⚠️ Não foi possível verificar RLS (função exec_sql pode não existir)');
            console.log('   ℹ️ Continuando com outros testes...');
        } else if (rlsStatus && rlsStatus.length > 0) {
            const enabled = rlsStatus[0].relrowsecurity;
            console.log(`   ${enabled ? '✅' : '❌'} RLS ${enabled ? 'HABILITADO' : 'DESABILITADO'}`);
        }

        // Test 2: List all policies
        console.log('\n2️⃣ Listando políticas RLS...');
        const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
            sql_query: `
        SELECT 
          polname as policy_name,
          polcmd as command,
          CASE polpermissive
            WHEN true THEN 'PERMISSIVE'
            ELSE 'RESTRICTIVE'
          END as type,
          pg_get_expr(polqual, polrelid) as using_clause,
          pg_get_expr(polwithcheck, polrelid) as check_clause
        FROM pg_policy
        WHERE polrelid = 'notifications'::regclass
        ORDER BY polname;
      `
        });

        if (policiesError) {
            console.log('   ⚠️ Não foi possível listar políticas');
        } else if (policies && policies.length > 0) {
            console.log(`   ✅ ${policies.length} política(s) encontrada(s):\n`);
            policies.forEach(policy => {
                console.log(`   📋 ${policy.policy_name}`);
                console.log(`      Comando: ${policy.command}`);
                console.log(`      Tipo: ${policy.type}`);
                if (policy.using_clause) {
                    console.log(`      USING: ${policy.using_clause}`);
                }
                if (policy.check_clause) {
                    console.log(`      CHECK: ${policy.check_clause}`);
                }
                console.log('');
            });
        } else {
            console.log('   ⚠️ Nenhuma política RLS encontrada');
        }

        // Test 3: Test service role can insert
        console.log('3️⃣ Testando inserção com service role...');

        // Get a test user
        const { data: testUser } = await supabase
            .from('users_unified')
            .select('id')
            .limit(1)
            .single();

        if (!testUser) {
            console.log('   ⚠️ Nenhum usuário encontrado para teste');
        } else {
            const testNotification = {
                user_id: testUser.id,
                type: 'system',
                title: 'RLS Test Notification',
                message: 'This is a test notification to verify RLS policies',
                priority: 'low',
                created_at: new Date().toISOString()
            };

            const { data: inserted, error: insertError } = await supabase
                .from('notifications')
                .insert(testNotification)
                .select()
                .single();

            if (insertError) {
                console.log('   ❌ Erro ao inserir:', insertError.message);
            } else {
                console.log('   ✅ Service role pode inserir notificações');

                // Test 4: Test service role can select
                console.log('\n4️⃣ Testando leitura com service role...');
                const { data: selected, error: selectError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('id', inserted.id)
                    .single();

                if (selectError) {
                    console.log('   ❌ Erro ao ler:', selectError.message);
                } else {
                    console.log('   ✅ Service role pode ler notificações');
                }

                // Test 5: Test service role can update
                console.log('\n5️⃣ Testando atualização com service role...');
                const { error: updateError } = await supabase
                    .from('notifications')
                    .update({ read_at: new Date().toISOString() })
                    .eq('id', inserted.id);

                if (updateError) {
                    console.log('   ❌ Erro ao atualizar:', updateError.message);
                } else {
                    console.log('   ✅ Service role pode atualizar notificações');
                }

                // Clean up test notification
                await supabase
                    .from('notifications')
                    .delete()
                    .eq('id', inserted.id);
            }
        }

        // Test 6: Verify schema matches expectations
        console.log('\n6️⃣ Verificando schema da tabela...');
        const { data: columns, error: columnsError } = await supabase.rpc('exec_sql', {
            sql_query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        ORDER BY ordinal_position;
      `
        });

        if (columnsError) {
            console.log('   ⚠️ Não foi possível verificar schema');
        } else if (columns) {
            const requiredColumns = ['id', 'user_id', 'type', 'title', 'message', 'read_at', 'created_at', 'action_url', 'priority', 'expires_at'];
            const existingColumns = columns.map(c => c.column_name);

            const missing = requiredColumns.filter(col => !existingColumns.includes(col));
            const hasReadAt = existingColumns.includes('read_at');
            const hasOldRead = existingColumns.includes('read');

            console.log(`   ✅ Schema verificado:`);
            console.log(`      Total de colunas: ${columns.length}`);
            console.log(`      ${hasReadAt ? '✅' : '❌'} read_at (TIMESTAMP) ${hasReadAt ? 'existe' : 'NÃO EXISTE'}`);
            console.log(`      ${!hasOldRead ? '✅' : '⚠️'} read (BOOLEAN) ${hasOldRead ? 'ainda existe (deve ser removido)' : 'não existe (correto)'}`);

            if (missing.length > 0) {
                console.log(`      ⚠️ Colunas faltando: ${missing.join(', ')}`);
            }
        }

        console.log('\n✅ Verificação de RLS concluída!\n');

    } catch (error) {
        console.error('\n❌ Erro durante verificação:', error.message);
        process.exit(1);
    }
}

verifyRLSPolicies()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
