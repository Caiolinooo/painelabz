// Script para verificar se o usuário administrador existe no banco de dados
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  console.log('Verificando usuário administrador no banco de dados...');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;

  if (!adminEmail || !adminPhone) {
    console.error('Variáveis de ambiente ADMIN_EMAIL e ADMIN_PHONE_NUMBER são obrigatórias');
    process.exit(1);
  }

  // Extrair informações da string de conexão
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Variável de ambiente DATABASE_URL não está definida');
    process.exit(1);
  }

  // Criar pool de conexão
  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    // Verificar se a tabela User existe
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'User'
      );
    `);

    const tableExists = tableCheckResult.rows[0].exists;
    console.log('Tabela User existe:', tableExists);

    if (tableExists) {
      // Verificar se o usuário admin existe
      const userCheckResult = await pool.query(`
        SELECT * FROM "User"
        WHERE "phoneNumber" = $1 OR "email" = $2
      `, [adminPhone, adminEmail]);

      const adminExists = userCheckResult.rows.length > 0;
      console.log('Usuário administrador existe:', adminExists);

      if (adminExists) {
        console.log('Detalhes do usuário administrador:');
        console.log('ID:', userCheckResult.rows[0].id);
        console.log('Email:', userCheckResult.rows[0].email);
        console.log('Telefone:', userCheckResult.rows[0].phoneNumber);
        console.log('Nome:', userCheckResult.rows[0].firstName, userCheckResult.rows[0].lastName);
        console.log('Papel:', userCheckResult.rows[0].role);
        console.log('Senha (hash):', userCheckResult.rows[0].password ? 'Definida' : 'Não definida');
        console.log('Ativo:', userCheckResult.rows[0].active);
      }
    }

    // Listar todas as tabelas no banco de dados
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log('Tabelas existentes no banco de dados:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
  } catch (error) {
    console.error('Erro ao verificar usuário administrador:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a verificação:', error);
    process.exit(1);
  });
