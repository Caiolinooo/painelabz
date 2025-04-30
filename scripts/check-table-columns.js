// Script para verificar as colunas das tabelas existentes
require('dotenv').config();
const { Pool } = require('pg');

// Configurações
const DATABASE_URL = process.env.DATABASE_URL;

// Verificar se as variáveis de ambiente estão configuradas
if (!DATABASE_URL) {
  console.error('DATABASE_URL não está definido. Configure a variável de ambiente.');
  process.exit(1);
}

// Criar pool de conexão com o PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para verificar as tabelas e colunas
async function checkTableColumns() {
  const client = await pool.connect();

  try {
    console.log('Verificando tabelas e colunas existentes...');

    // Listar todas as tabelas
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`\nTabelas encontradas (${tables.length}):`);
    tables.forEach(table => console.log(`- ${table}`));

    // Para cada tabela, listar suas colunas
    for (const table of tables) {
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      console.log(`\nColunas da tabela "${table}" (${columnsResult.rows.length}):`);
      columnsResult.rows.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

  } catch (error) {
    console.error('Erro ao verificar tabelas e colunas:', error);
  } finally {
    client.release();
  }
}

// Executar a função
checkTableColumns()
  .then(() => {
    console.log('\nVerificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
