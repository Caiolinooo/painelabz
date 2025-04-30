// Script para popular a tabela funcionarios com dados da tabela users
require('dotenv').config();
const { Pool } = require('pg');

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

// Função para popular a tabela funcionarios
async function populateFuncionarios() {
  const client = await pool.connect();

  try {
    console.log('Iniciando população da tabela funcionarios...');

    // Iniciar uma transação
    await client.query('BEGIN');

    // Verificar se a tabela funcionarios existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'funcionarios'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.error('A tabela funcionarios não existe. Execute primeiro o script de criação das tabelas.');
      await client.query('ROLLBACK');
      return;
    }

    // Verificar se já existem dados na tabela funcionarios
    const existingData = await client.query('SELECT COUNT(*) FROM funcionarios');
    if (existingData.rows[0].count > 0) {
      console.log('A tabela funcionarios já contém dados. Pulando a população.');
      await client.query('ROLLBACK');
      return;
    }

    // Buscar todos os usuários ativos
    const usersResult = await client.query(`
      SELECT id, first_name, last_name, email, position, department, role
      FROM users
      WHERE active = true
    `);

    if (usersResult.rows.length === 0) {
      console.log('Nenhum usuário ativo encontrado para popular a tabela funcionarios.');
      await client.query('ROLLBACK');
      return;
    }

    console.log(`Encontrados ${usersResult.rows.length} usuários ativos para adicionar como funcionários.`);

    // Inserir cada usuário como funcionário
    for (const user of usersResult.rows) {
      const nome = `${user.first_name} ${user.last_name}`.trim();
      const cargo = user.position || 'Não especificado';
      const departamento = user.department || 'Não especificado';
      const email = user.email;
      const matricula = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const status = 'ativo';
      const userId = user.id;

      await client.query(`
        INSERT INTO funcionarios (
          nome, cargo, departamento, email, matricula, status, user_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        ON CONFLICT (email) DO NOTHING
      `, [nome, cargo, departamento, email, matricula, status, userId]);

      console.log(`Funcionário adicionado: ${nome} (${email})`);
    }

    // Commit da transação
    await client.query('COMMIT');

    console.log('População da tabela funcionarios concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao popular tabela funcionarios:', error);

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

// Executar a função
populateFuncionarios()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
