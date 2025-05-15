// Script para criar a view de avaliações
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
async function createView() {
  const client = await pool.connect();

  try {
    console.log('Iniciando criação da view de avaliações...');

    // Ler o arquivo SQL
    const sqlFilePath = path.resolve(__dirname, 'create-avaliacao-view.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Iniciar uma transação
    await client.query('BEGIN');

    try {
      // Executar o SQL completo
      console.log('Executando script SQL para criar a view...');
      await client.query(sqlContent);
      console.log('View criada com sucesso!');
    } catch (error) {
      console.error('Erro ao executar script SQL:', error);

      // Rollback em caso de erro
      await client.query('ROLLBACK');
      throw error;
    }

    // Commit da transação
    await client.query('COMMIT');

    console.log('Criação da view de avaliações concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao criar view:', error);

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
    // Fechar o pool
    pool.end();
  }
}

// Executar a função
createView()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
