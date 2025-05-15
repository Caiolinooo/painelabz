/**
 * Script para adicionar chaves estrangeiras à tabela avaliacoes_desempenho
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();
dotenv.config({ path: '.env.local' });

// Ler o arquivo SQL
const sqlFilePath = path.join(__dirname, 'add-foreign-keys-to-avaliacoes-desempenho.sql');
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Configurar conexão com o banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Função para executar o script SQL
async function addForeignKeys() {
  const client = await pool.connect();

  try {
    console.log('Conectado ao banco de dados. Adicionando chaves estrangeiras à tabela avaliacoes_desempenho...');

    // Iniciar uma transação
    await client.query('BEGIN');

    // Executar o script SQL
    await client.query(sqlContent);

    // Confirmar a transação
    await client.query('COMMIT');

    console.log('Chaves estrangeiras adicionadas com sucesso à tabela avaliacoes_desempenho!');
  } catch (error) {
    // Reverter a transação em caso de erro
    await client.query('ROLLBACK');
    console.error('Erro ao adicionar chaves estrangeiras:', error);
    
    // Verificar se o erro é porque as chaves já existem
    if (error.message.includes('already exists')) {
      console.log('As chaves estrangeiras já existem na tabela.');
    }
  } finally {
    client.release();
  }
}

// Executar a função
addForeignKeys()
  .then(() => {
    console.log('Processo concluído.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante o processo:', error);
    process.exit(1);
  });
