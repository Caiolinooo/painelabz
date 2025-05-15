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
const sqlFilePath = path.join(__dirname, 'add-foreign-keys-complete.sql');
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
    
    // Verificar se as chaves estrangeiras foram adicionadas
    const checkQuery = `
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'avaliacoes_desempenho';
    `;

    const result = await client.query(checkQuery);

    if (result.rows.length === 0) {
      console.log('Nenhuma chave estrangeira encontrada após a execução do script.');
    } else {
      console.log('Chaves estrangeiras encontradas:');
      result.rows.forEach(row => {
        console.log(`- ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    }
    
    // Verificar se a view foi criada
    const viewQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_avaliacoes_desempenho'
      );
    `;
    
    const viewResult = await client.query(viewQuery);
    const viewExists = viewResult.rows[0].exists;
    
    console.log(`A view vw_avaliacoes_desempenho ${viewExists ? 'foi criada com sucesso' : 'NÃO foi criada'}.`);
  } catch (error) {
    // Reverter a transação em caso de erro
    await client.query('ROLLBACK');
    console.error('Erro ao adicionar chaves estrangeiras:', error);
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
