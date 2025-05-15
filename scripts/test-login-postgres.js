// Script para testar o login usando o PostgreSQL diretamente
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function main() {
  console.log('Testando login usando o PostgreSQL diretamente...');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPhone || !adminPassword) {
    console.error('Variáveis de ambiente ADMIN_EMAIL, ADMIN_PHONE_NUMBER e ADMIN_PASSWORD são obrigatórias');
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
    // Buscar o usuário pelo email ou número de telefone
    console.log('Buscando usuário com email:', adminEmail);
    let userResult = await pool.query(`
      SELECT * FROM "User"
      WHERE "email" = $1
    `, [adminEmail]);

    let user = userResult.rows[0];

    if (!user) {
      console.log('Usuário não encontrado pelo email, tentando pelo telefone:', adminPhone);
      userResult = await pool.query(`
        SELECT * FROM "User"
        WHERE "phoneNumber" = $1
      `, [adminPhone]);

      user = userResult.rows[0];
    }

    if (!user) {
      console.error('Usuário não encontrado!');
      return;
    }

    console.log('Usuário encontrado:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Telefone:', user.phoneNumber);
    console.log('Nome:', user.firstName, user.lastName);
    console.log('Papel:', user.role);
    console.log('Senha (hash):', user.password ? user.password.substring(0, 20) + '...' : 'Não definida');

    // Verificar a senha
    if (user.password) {
      console.log('Verificando senha...');
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
        console.log('Login bem-sucedido!');

        // Atualizar histórico de acesso
        let accessHistory = user.accessHistory || [];
        if (!Array.isArray(accessHistory)) {
          accessHistory = [];
        }

        accessHistory.push({
          timestamp: new Date(),
          action: 'LOGIN',
          details: 'Login com senha (teste direto)'
        });

        await pool.query(`
          UPDATE "User"
          SET
            "accessHistory" = $1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $2
        `, [JSON.stringify(accessHistory), user.id]);

        console.log('Histórico de acesso atualizado');
      } else {
        console.log('Senha incorreta!');
      }
    } else {
      console.log('Usuário não possui senha definida!');
    }
  } catch (error) {
    console.error('Erro ao testar login:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  });
