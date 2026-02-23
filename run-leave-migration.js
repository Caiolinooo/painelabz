// Script para executar migration de férias no banco de dados via PG
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigrationPG() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('Conectando ao PostgreSQL (Supabase)...');
        await client.connect();

        const sqlPath = path.join(__dirname, 'src', 'lib', 'database', 'migrations', '20260219_create_leave_module.sql');
        const sqlString = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executando SQL...');

        await client.query(sqlString);
        console.log('Migration aplicada com sucesso!');

    } catch (err) {
        console.error('Erro ao executar migration via pg:', err);
    } finally {
        await client.end();
        console.log('Conexão fechada.');
    }
}

runMigrationPG();
