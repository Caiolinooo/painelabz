// Script para testar o login diretamente com o banco de dados
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function main() {
  console.log('Testando login diretamente com o banco de dados...');

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
    // Verificar se o usuário admin existe
    const userCheckResult = await pool.query(`
      SELECT * FROM "User"
      WHERE "phoneNumber" = $1 OR "email" = $2
    `, [adminPhone, adminEmail]);

    const adminExists = userCheckResult.rows.length > 0;
    console.log('Usuário administrador existe:', adminExists);

    if (adminExists) {
      const user = userCheckResult.rows[0];
      console.log('Detalhes do usuário administrador:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Telefone:', user.phoneNumber);
      console.log('Nome:', user.firstName, user.lastName);
      console.log('Papel:', user.role);
      console.log('Senha (hash):', user.password ? user.password.substring(0, 20) + '...' : 'Não definida');
      console.log('Ativo:', user.active);

      // Verificar a senha
      if (user.password) {
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
        } else {
          console.log('Senha incorreta!');

          // Atualizar a senha do usuário
          console.log('Atualizando senha do usuário...');
          const hashedPassword = await bcrypt.hash(adminPassword, 10);

          await pool.query(`
            UPDATE "User"
            SET "password" = $1
            WHERE "id" = $2
          `, [hashedPassword, user.id]);

          console.log('Senha atualizada com sucesso!');

          // Verificar a senha novamente
          const isPasswordValidAfterUpdate = await bcrypt.compare(adminPassword, hashedPassword);
          console.log('Senha válida após atualização:', isPasswordValidAfterUpdate);
        }
      } else {
        console.log('Usuário não possui senha definida!');

        // Definir a senha do usuário
        console.log('Definindo senha do usuário...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await pool.query(`
          UPDATE "User"
          SET "password" = $1
          WHERE "id" = $2
        `, [hashedPassword, user.id]);

        console.log('Senha definida com sucesso!');
      }
    } else {
      console.log('Usuário administrador não existe!');

      // Criar usuário administrador
      console.log('Criando usuário administrador...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await pool.query(`
        INSERT INTO "User" (
          "id",
          "firstName",
          "lastName",
          "email",
          "phoneNumber",
          "password",
          "role",
          "position",
          "department",
          "active",
          "passwordLastChanged",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
      `, [
        require('uuid').v4(),
        'Caio',
        'Correia',
        adminEmail,
        adminPhone,
        hashedPassword,
        'ADMIN',
        'Administrador do Sistema',
        'TI',
        true,
        new Date(),
        new Date(),
        new Date()
      ]);

      console.log('Usuário administrador criado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao verificar/atualizar usuário administrador:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  });
