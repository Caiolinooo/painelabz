/**
 * Script para verificar se as tabelas e views necessárias para o módulo de avaliação existem
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

// Função para verificar tabelas e views
async function verifyTablesAndViews() {
  const client = await pool.connect();

  try {
    console.log('Verificando tabelas e views do módulo de avaliação...');

    // Verificar tabela avaliacoes_desempenho
    const avaliacoesDesempenhoCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'avaliacoes_desempenho'
      );
    `);

    const avaliacoesDesempenhoExists = avaliacoesDesempenhoCheck.rows[0].exists;
    console.log(`Tabela avaliacoes_desempenho: ${avaliacoesDesempenhoExists ? 'Existe' : 'Não existe'}`);

    // Verificar tabela pontuacoes
    const pontuacoesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pontuacoes'
      );
    `);

    const pontuacoesExists = pontuacoesCheck.rows[0].exists;
    console.log(`Tabela pontuacoes: ${pontuacoesExists ? 'Existe' : 'Não existe'}`);

    // Verificar view vw_avaliacoes_desempenho
    const viewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'vw_avaliacoes_desempenho'
      );
    `);

    const viewExists = viewCheck.rows[0].exists;
    console.log(`View vw_avaliacoes_desempenho: ${viewExists ? 'Existe' : 'Não existe'}`);

    // Se a view não existir, criar
    if (!viewExists) {
      console.log('Criando view vw_avaliacoes_desempenho...');
      
      try {
        await client.query(`
          CREATE OR REPLACE VIEW vw_avaliacoes_desempenho AS
          SELECT 
              a.id,
              a.funcionario_id,
              a.avaliador_id,
              a.periodo,
              a.data_inicio,
              a.data_fim,
              a.status,
              a.pontuacao_total,
              a.observacoes,
              a.created_at,
              a.updated_at,
              a.deleted_at,
              f.nome AS funcionario_nome,
              f.cargo AS funcionario_cargo,
              f.departamento AS funcionario_departamento,
              av.nome AS avaliador_nome,
              av.cargo AS avaliador_cargo
          FROM 
              avaliacoes_desempenho a
          LEFT JOIN 
              funcionarios f ON a.funcionario_id = f.id
          LEFT JOIN 
              funcionarios av ON a.avaliador_id = av.id
          WHERE 
              a.deleted_at IS NULL;
        `);
        
        console.log('View vw_avaliacoes_desempenho criada com sucesso!');
      } catch (error) {
        console.error('Erro ao criar view vw_avaliacoes_desempenho:', error);
      }
    }

    // Verificar se há registros na tabela avaliacoes_desempenho
    if (avaliacoesDesempenhoExists) {
      const countQuery = await client.query('SELECT COUNT(*) FROM avaliacoes_desempenho WHERE deleted_at IS NULL;');
      const count = parseInt(countQuery.rows[0].count);
      console.log(`Número de avaliações na tabela avaliacoes_desempenho: ${count}`);
    }

    console.log('Verificação concluída!');
  } catch (error) {
    console.error('Erro ao verificar tabelas e views:', error);
  } finally {
    client.release();
    pool.end();
  }
}

// Executar a verificação
verifyTablesAndViews();
