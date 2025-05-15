/**
 * Script para verificar as chaves estrangeiras na tabela avaliacoes_desempenho
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Configurar conexão com o banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Função para verificar as chaves estrangeiras
async function checkForeignKeys() {
  const client = await pool.connect();

  try {
    console.log('Verificando chaves estrangeiras da tabela avaliacoes_desempenho...');

    // Consulta para verificar as chaves estrangeiras
    const query = `
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

    const result = await client.query(query);

    if (result.rows.length === 0) {
      console.log('Nenhuma chave estrangeira encontrada na tabela avaliacoes_desempenho.');
    } else {
      console.log('Chaves estrangeiras encontradas:');
      result.rows.forEach(row => {
        console.log(`- ${row.constraint_name}: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    }

    // Verificar se a tabela funcionarios existe
    const funcionariosQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'funcionarios'
      );
    `;
    
    const funcionariosResult = await client.query(funcionariosQuery);
    const funcionariosExists = funcionariosResult.rows[0].exists;
    
    console.log(`A tabela funcionarios ${funcionariosExists ? 'existe' : 'NÃO existe'} no banco de dados.`);

    if (funcionariosExists) {
      // Verificar a estrutura da tabela funcionarios
      const funcionariosStructureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'funcionarios'
        ORDER BY ordinal_position;
      `;

      const funcionariosStructureResult = await client.query(funcionariosStructureQuery);
      console.log('Estrutura da tabela funcionarios:');
      funcionariosStructureResult.rows.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
      });
    }
  } catch (error) {
    console.error('Erro ao verificar chaves estrangeiras:', error);
  } finally {
    client.release();
  }
}

// Executar a função
checkForeignKeys()
  .then(() => {
    console.log('Verificação concluída.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a verificação:', error);
    process.exit(1);
  });
