require('dotenv').config({ path: '.env.local' });
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    require('dotenv').config(); // Fallback to .env
}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no arquivo .env');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupSuppliers() {
    try {
        console.log('Iniciando setup da tabela suppliers...');

        // Lendo o arquivo SQL
        const sqlPath = path.join(__dirname, '../src/lib/database/migrations/20260223_create_suppliers_tables.sql');
        const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executando script SQL...');

        // Tentar executar via execute_sql (função RPC que já existe)
        const { error: rpcError } = await supabaseAdmin.rpc('execute_sql', { query: sqlQuery });

        if (rpcError) {
            console.error('Erro ao executar SQL via RPC:', rpcError);
            throw new Error('Falha ao criar tabelas de fornecedores');
        }

        console.log('Tabela suppliers criada e configurada com sucesso!');

        // Inserindo alguns dados de exemplo (opcional)
        const { data: count, error: countError } = await supabaseAdmin
            .from('suppliers')
            .select('id', { count: 'exact', head: true });

        if (!countError && count === 0) {
            console.log('Inserindo fornecedor de exemplo...');
            await supabaseAdmin.from('suppliers').insert({
                trade_name: 'Fornecedor Exemplo LTDA',
                legal_name: 'Exemplo Comércio e Serviços LTDA',
                document_number: '12.345.678/0001-90',
                contact_email: 'contato@exemplo.com.br',
                contact_phone: '(11) 99999-9999',
                city: 'São Paulo',
                state_uf: 'SP',
                status: 'active'
            });
            console.log('Fornecedor de exemplo inserido.');
        }

        return true;
    } catch (error) {
        console.error('Erro ao criar tabela suppliers:', error);
        return false;
    }
}

setupSuppliers().then(success => process.exit(success ? 0 : 1));
