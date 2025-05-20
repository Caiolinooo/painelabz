const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Configurar conexão com o banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL
});

async function executeSql() {
  const client = await pool.connect();

  try {
    console.log('Iniciando adição da coluna password_hash à tabela users_unified...');

    // Ler o arquivo SQL
    const sqlFilePath = path.resolve(__dirname, 'add-password-hash-column.sql');
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

    console.log('Adição da coluna password_hash concluída com sucesso!');
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
