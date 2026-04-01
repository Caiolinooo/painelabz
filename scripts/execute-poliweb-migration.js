/**
 * Execute Poliweb Migration via Supabase Management API
 * Uses the Supabase SQL API to run DDL statements
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos');
    process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function executeMigration() {
    console.log('🔧 Executando migração Poliweb...\n');

    // Check if table exists
    const { data: existing, error: checkError } = await supabase
        .from('poliweb_credentials')
        .select('id')
        .limit(1);

    if (!checkError) {
        console.log('✅ Tabela poliweb_credentials já existe!\n');
    } else {
        console.log('⚠️  Tabela poliweb_credentials não encontrada.');
        console.log('   A migração precisa ser executada manualmente.\n');
        console.log('📋 Instruções:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/arzvingdtnttiejcvucs/sql');
        console.log('   2. Cole o conteúdo do arquivo:');
        console.log('      supabase/migrations/20260401_create_poliweb_credentials.sql');
        console.log('   3. Clique em Run');
        console.log('   4. Execute este script novamente: node scripts/execute-poliweb-migration.js\n');
        return;
    }

    // Find Hudna user
    console.log('🔍 Buscando usuário da Hudna...');
    const { data: hudnaUser } = await supabase
        .from('users_unified')
        .select('id, email, first_name, last_name')
        .ilike('email', '%hudna%')
        .single();

    if (!hudnaUser) {
        console.log('❌ Usuário da Hudna não encontrado!\n');
        return;
    }
    console.log(`✅ Hudna: ${hudnaUser.first_name} ${hudnaUser.last_name} (${hudnaUser.email})`);
    console.log(`   ID: ${hudnaUser.id}\n`);

    // Find admin users
    console.log('🔍 Buscando administradores...');
    const { data: adminUsers } = await supabase
        .from('users_unified')
        .select('id, email, first_name, last_name, role')
        .eq('role', 'ADMIN')
        .limit(5);

    if (adminUsers && adminUsers.length > 0) {
        console.log('✅ Administradores encontrados:');
        adminUsers.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.first_name} ${u.last_name} (${u.email}) [ID: ${u.id}]`);
        });
    }
    console.log('');

    // Insert Hudna's credentials
    console.log('🔑 Inserindo credenciais da Hudna...');
    const { data: hudnaCreds, error: hudnaError } = await supabase
        .from('poliweb_credentials')
        .upsert({
            user_id: hudnaUser.id,
            username: 'hudna.mendonca@groupabz.com',
            password: 'Clave#123'
        }, { onConflict: 'user_id' })
        .select()
        .single();

    if (hudnaError) {
        console.error(`❌ Erro: ${hudnaError.message}`);
    } else {
        console.log('✅ Credenciais da Hudna salvas!');
        console.log('   Email: hudna.mendonca@groupabz.com');
        console.log('   Senha: Clave#123\n');
    }

    // Check if Caio already has credentials
    const caioUser = adminUsers?.find(u => u.email.includes('caio.correia'));
    if (caioUser) {
        console.log('ℹ️  Para configurar as credenciais do Caio:');
        console.log('   1. Acesse /admin/poliweb no portal');
        console.log('   2. Busque por "Caio"');
        console.log('   3. Clique no ícone de edição');
        console.log('   4. Insira o email e senha do Poliweb\n');
    }

    console.log('='.repeat(60));
    console.log('✅ Migração Poliweb concluída!');
    console.log('='.repeat(60));
    console.log('\nPróximos passos:');
    console.log('1. Acesse /admin/poliweb para configurar mais usuários');
    console.log('2. Acesse /poliweb para testar o login automático');
    console.log('');
}

executeMigration().catch(console.error);
