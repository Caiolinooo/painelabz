/**
 * Script para verificar se a tabela pontuacoes existe no Supabase
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
    console.log('Verificando se a tabela pontuacoes existe...');

    // Verificar se a tabela existe
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pontuacoes'
      );
    `;
    
    const tableCheckResult = await client.query(tableCheckQuery);
    const tableExists = tableCheckResult.rows[0].exists;

    if (tableExists) {
      console.log('A tabela pontuacoes existe!');

      // Contar registros na tabela
      const countQuery = 'SELECT COUNT(*) FROM pontuacoes;';
      const countResult = await client.query(countQuery);
      const count = countResult.rows[0].count;

      console.log(`A tabela pontuacoes contém ${count} registros.`);

      // Verificar estrutura da tabela
      const structureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'pontuacoes'
        ORDER BY ordinal_position;
      `;

      const structureResult = await client.query(structureQuery);
      console.log('Estrutura da tabela pontuacoes:');
      structureResult.rows.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
      });

      // Verificar políticas RLS
      const policiesQuery = `
        SELECT policyname, permissive, cmd, qual
        FROM pg_policies
        WHERE tablename = 'pontuacoes';
      `;

      const policiesResult = await client.query(policiesQuery);
      console.log('Políticas RLS da tabela pontuacoes:');
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
        WHERE tablename = 'pontuacoes';
      `;

      const indexesResult = await client.query(indexesQuery);
      console.log('Índices da tabela pontuacoes:');
      if (indexesResult.rows.length === 0) {
        console.log('Nenhum índice encontrado.');
      } else {
        indexesResult.rows.forEach(index => {
          console.log(`- ${index.indexname}: ${index.indexdef}`);
        });
      }

      // Mostrar amostra de dados
      if (count > 0) {
        const sampleQuery = 'SELECT * FROM pontuacoes LIMIT 3;';
        const sampleResult = await client.query(sampleQuery);
        console.log('Amostra de dados da tabela pontuacoes:');
        sampleResult.rows.forEach((row, index) => {
          console.log(`Registro ${index + 1}:`);
          Object.keys(row).forEach(key => {
            console.log(`  ${key}: ${row[key]}`);
          });
        });
      }
    } else {
      console.error('A tabela pontuacoes NÃO existe!');
      console.log('Criando a tabela pontuacoes...');
      
      // Criar a tabela pontuacoes
      const createTableQuery = `
        CREATE TABLE pontuacoes (
          id SERIAL PRIMARY KEY,
          avaliacao_id UUID NOT NULL,
          criterio_id INTEGER NOT NULL,
          valor NUMERIC(5,2) NOT NULL DEFAULT 0,
          observacao TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          deleted_at TIMESTAMP WITH TIME ZONE
        );
        
        -- Adicionar índices
        CREATE INDEX idx_pontuacoes_avaliacao_id ON pontuacoes(avaliacao_id);
        CREATE INDEX idx_pontuacoes_criterio_id ON pontuacoes(criterio_id);
        
        -- Adicionar políticas RLS
        ALTER TABLE pontuacoes ENABLE ROW LEVEL SECURITY;
        
        -- Política para administradores
        CREATE POLICY admin_all ON pontuacoes
          FOR ALL
          TO authenticated
          USING (true);
      `;
      
      await client.query(createTableQuery);
      console.log('Tabela pontuacoes criada com sucesso!');
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
