/**
 * Poliweb Migration and Setup Script
 * Creates the poliweb_credentials table and seeds test credentials
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function runSetup() {
    console.log('🔧 Configurando módulo Poliweb...\n');

    // Step 1: Test connection
    console.log('1️⃣ Testando conexão com o banco...');
    try {
        const { data, error } = await supabase
            .from('users_unified')
            .select('id')
            .limit(1);

        if (error) {
            console.error('❌ Erro de conexão:', error.message);
            console.log('\n⚠️  Execute a migração manualmente:');
            console.log('   1. Acesse: https://supabase.com/dashboard/project/arzvingdtnttiejcvucs/sql');
            console.log('   2. Cole o conteúdo de: supabase/migrations/20260401_create_poliweb_credentials.sql');
            console.log('   3. Clique em Run\n');
            return;
        }
        console.log('✅ Conexão estabelecida!\n');
    } catch (e) {
        console.error('❌ Erro:', e.message);
        return;
    }

    // Step 2: Find Hudna user
    console.log('2️⃣ Buscando usuário da Hudna...');
    const { data: hudnaUser, error: hudnaError } = await supabase
        .from('users_unified')
        .select('id, email, first_name, last_name')
        .ilike('email', '%hudna%')
        .single();

    let hudnaId = null;
    if (hudnaError) {
        console.log('⚠️  Usuário da Hudna não encontrado automaticamente');
        console.log('   Precisaremos do ID manualmente\n');
    } else {
        hudnaId = hudnaUser.id;
        console.log(`✅ Encontrado: ${hudnaUser.first_name} ${hudnaUser.last_name} (${hudnaUser.email})`);
        console.log(`   ID: ${hudnaId}\n`);
    }

    // Step 3: Find admin user
    console.log('3️⃣ Buscando usuário administrador...');
    const { data: adminUsers, error: adminError } = await supabase
        .from('users_unified')
        .select('id, email, first_name, last_name, role')
        .eq('role', 'ADMIN')
        .limit(5);

    let adminId = null;
    if (adminError || !adminUsers || adminUsers.length === 0) {
        console.log('⚠️  Nenhum administrador encontrado\n');
    } else {
        console.log('✅ Administradores encontrados:');
        adminUsers.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.first_name} ${u.last_name} (${u.email})`);
            console.log(`      ID: ${u.id}`);
        });
        adminId = adminUsers[0].id;
        console.log('');
    }

    // Step 4: Check if poliweb_credentials table exists
    console.log('4️⃣ Verificando tabela poliweb_credentials...');
    const { data: tableCheck, error: tableError } = await supabase
        .from('poliweb_credentials')
        .select('id')
        .limit(1);

    if (tableError && tableError.message.includes('relation') || tableError && tableError.message.includes('does not exist')) {
        console.log('❌ Tabela poliweb_credentials não existe!');
        console.log('\n📋 Execute a migração manualmente:');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/arzvingdtnttiejcvucs/sql');
        console.log('   2. Cole o conteúdo do arquivo:');
        console.log('      supabase/migrations/20260401_create_poliweb_credentials.sql');
        console.log('   3. Clique em Run');
        console.log('   4. Execute este script novamente para inserir as credenciais de teste\n');
        return;
    }
    console.log('✅ Tabela poliweb_credentials encontrada!\n');

    // Step 5: Insert test credentials
    console.log('5️⃣ Inserindo credenciais de teste...');

    if (hudnaId) {
        const { data: hudnaCreds, error: hudnaInsertError } = await supabase
            .from('poliweb_credentials')
            .upsert({
                user_id: hudnaId,
                username: 'hudna.mendonca@groupabz.com',
                password: 'Clave#123'
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (hudnaInsertError) {
            console.error(`❌ Erro ao inserir credenciais da Hudna: ${hudnaInsertError.message}`);
        } else {
            console.log('✅ Credenciais da Hudna inseridas!');
            console.log(`   Email: hudna.mendonca@groupabz.com`);
            console.log(`   Senha: Clave#123\n`);
        }
    } else {
        console.log('⚠️  Pulando credenciais da Hudna - ID não encontrado');
        console.log('   Para adicionar manualmente, execute no SQL Editor do Supabase:');
        console.log(`   INSERT INTO poliweb_credentials (user_id, username, password)`);
        console.log(`   VALUES ('SEU_USER_ID_AQUI', 'hudna.mendonca@groupabz.com', 'Clave#123');\n`);
    }

    if (adminId) {
        console.log('ℹ️  Para adicionar credenciais do administrador, execute:');
        console.log(`   - Acesse /admin/poliweb no portal`);
        console.log(`   - Busque pelo seu nome`);
        console.log(`   - Clique no ícone de edição e insira email/senha do Poliweb\n`);
    }

    console.log('='.repeat(60));
    console.log('✅ Configuração Poliweb concluída!');
    console.log('='.repeat(60));
    console.log('\nPróximos passos:');
    console.log('1. Acesse /admin/poliweb para configurar credenciais de outros usuários');
    console.log('2. Acesse /poliweb para testar o login automático');
    console.log('');
}

runSetup().catch(console.error);
