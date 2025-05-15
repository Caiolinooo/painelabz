// Script para verificar o contexto de autenticação
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function main() {
  console.log('Verificando contexto de autenticação...');

  const adminEmail = 'caio.correia@groupabz.com';
  const adminPassword = 'Caio@2122@';

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
    // Buscar o usuário pelo email
    console.log('Buscando usuário com email:', adminEmail);
    const userResult = await pool.query(`
      SELECT * FROM "User"
      WHERE "email" = $1
    `, [adminEmail]);

    if (userResult.rows.length === 0) {
      console.log('Usuário não encontrado pelo email.');
      return;
    }

    const user = userResult.rows[0];
    console.log('Usuário encontrado:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Telefone:', user.phoneNumber);
    console.log('Nome:', user.firstName, user.lastName);
    console.log('Papel:', user.role);

    // Verificar a senha
    const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
    console.log('Senha válida:', isPasswordValid);

    if (isPasswordValid) {
      // Gerar token JWT
      const token = jwt.sign(
        {
          userId: user.id,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      console.log('Token JWT gerado:', token.substring(0, 20) + '...');

      // Verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      console.log('Token decodificado:', decoded);

      // Verificar permissões
      console.log('Permissões de acesso:', user.accessPermissions);

      // Verificar histórico de acesso
      console.log('Histórico de acesso:', user.accessHistory);

      console.log('Contexto de autenticação verificado com sucesso!');
    } else {
      console.log('Senha inválida!');
    }
  } catch (error) {
    console.error('Erro ao verificar contexto de autenticação:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a verificação:', error);
    process.exit(1);
  });
