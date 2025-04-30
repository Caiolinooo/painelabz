// Script para criar a tabela users_unified
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

// Função para executar o SQL
async function executeSql() {
  const client = await pool.connect();

  try {
    console.log('Iniciando criação da tabela users_unified...');

    // Ler o arquivo SQL
    const sqlFilePath = path.resolve(__dirname, 'create-users-unified.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Iniciar uma transação
    await client.query('BEGIN');

    try {
      // Executar o SQL completo
      console.log('Executando script SQL...');
      await client.query(sqlContent);
      console.log('Script SQL executado com sucesso.');
    } catch (error) {
      console.error('Erro ao executar script SQL:', error);

      // Rollback em caso de erro
      await client.query('ROLLBACK');
      throw error;
    }

    // Commit da transação
    await client.query('COMMIT');

    console.log('Criação da tabela users_unified concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao executar SQL:', error);

    // Garantir que a transação seja revertida em caso de erro
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Erro ao fazer rollback:', rollbackError);
    }

    process.exit(1);
  } finally {
    // Liberar o cliente
    client.release();
  }
}

// Executar o SQL
executeSql()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
