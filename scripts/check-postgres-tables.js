// Script para verificar se todas as tabelas necessárias existem no PostgreSQL
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  console.log('Verificando tabelas no PostgreSQL...');

  // Extrair informações da string de conexão
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Variável de ambiente DATABASE_URL não está definida');
    process.exit(1);
  }

  // Criar pool de conexão
  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    // Listar todas as tabelas no banco de dados
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log('Tabelas existentes no banco de dados:');
    const existingTables = tablesResult.rows.map(row => row.table_name);

    if (existingTables.length === 0) {
      console.log('Nenhuma tabela encontrada.');
    } else {
      existingTables.forEach(table => {
        console.log(`- ${table}`);
      });
    }

    // Lista de tabelas necessárias
    const requiredTables = [
      'User',
      'SiteConfig',
      'Card',
      'MenuItem',
      'Document',
      'News',
      'Reimbursement',
      'AuthorizedUser'
    ];

    console.log('\nVerificando tabelas necessárias:');
    const missingTables = [];

    requiredTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`✅ ${table} - Existe`);
      } else {
        console.log(`❌ ${table} - Não existe`);
        missingTables.push(table);
      }
    });

    if (missingTables.length > 0) {
      console.log('\nTabelas faltando:');
      missingTables.forEach(table => {
        console.log(`- ${table}`);
      });

      console.log('\nExecute o comando "npx prisma db push" para criar as tabelas faltantes.');
    } else {
      console.log('\nTodas as tabelas necessárias existem!');
    }

    // Verificar a estrutura da tabela User
    if (existingTables.includes('User')) {
      const userColumnsResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'User'
      `);

      console.log('\nEstrutura da tabela User:');
      userColumnsResult.rows.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type})`);
      });
    }
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a verificação:', error);
    process.exit(1);
  });
