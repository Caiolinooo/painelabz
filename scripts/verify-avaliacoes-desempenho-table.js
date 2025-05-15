/**
 * Script para verificar se a tabela avaliacoes_desempenho existe no Supabase
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

// Função para verificar a tabela
async function verifyTable() {
  const client = await pool.connect();

  try {
    console.log('Verificando se a tabela avaliacoes_desempenho existe...');

    // Verificar se a tabela existe
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'avaliacoes_desempenho'
      );
    `;
    
    const tableCheckResult = await client.query(tableCheckQuery);
    const tableExists = tableCheckResult.rows[0].exists;

    if (tableExists) {
      console.log('A tabela avaliacoes_desempenho existe!');

      // Contar registros na tabela
      const countQuery = 'SELECT COUNT(*) FROM avaliacoes_desempenho;';
      const countResult = await client.query(countQuery);
      const count = countResult.rows[0].count;

      console.log(`A tabela avaliacoes_desempenho contém ${count} registros.`);

      // Verificar estrutura da tabela
      const structureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'avaliacoes_desempenho'
        ORDER BY ordinal_position;
      `;

      const structureResult = await client.query(structureQuery);
      console.log('Estrutura da tabela avaliacoes_desempenho:');
      structureResult.rows.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
      });

      // Verificar políticas RLS
      const policiesQuery = `
        SELECT policyname, permissive, cmd, qual
        FROM pg_policies
        WHERE tablename = 'avaliacoes_desempenho';
      `;

      const policiesResult = await client.query(policiesQuery);
      console.log('Políticas RLS da tabela avaliacoes_desempenho:');
      if (policiesResult.rows.length === 0) {
        console.log('Nenhuma política RLS encontrada.');
      } else {
        policiesResult.rows.forEach(policy => {
          console.log(`- ${policy.policyname}: ${policy.cmd} (${policy.permissive === 'YES' ? 'permissive' : 'restrictive'})`);
        });
      }

      // Verificar índices
      const indexesQuery = `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'avaliacoes_desempenho';
      `;

      const indexesResult = await client.query(indexesQuery);
      console.log('Índices da tabela avaliacoes_desempenho:');
      if (indexesResult.rows.length === 0) {
        console.log('Nenhum índice encontrado.');
      } else {
        indexesResult.rows.forEach(index => {
          console.log(`- ${index.indexname}: ${index.indexdef}`);
        });
      }

      // Mostrar amostra de dados
      if (count > 0) {
        const sampleQuery = 'SELECT * FROM avaliacoes_desempenho LIMIT 3;';
        const sampleResult = await client.query(sampleQuery);
        console.log('Amostra de dados da tabela avaliacoes_desempenho:');
        sampleResult.rows.forEach((row, index) => {
          console.log(`Registro ${index + 1}:`);
          Object.keys(row).forEach(key => {
            console.log(`  ${key}: ${row[key]}`);
          });
        });
      }
    } else {
      console.error('A tabela avaliacoes_desempenho NÃO existe!');
      console.log('Execute o script run-create-avaliacoes-desempenho-table.js para criar a tabela.');
    }
  } catch (error) {
    console.error('Erro ao verificar a tabela:', error);
  } finally {
    client.release();
  }
}

// Executar a verificação
verifyTable()
  .then(() => {
    console.log('Verificação concluída.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a verificação:', error);
    process.exit(1);
  });
