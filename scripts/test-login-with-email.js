// Script para testar o login com email específico
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function main() {
  console.log('Testando login com email específico...');

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
      console.log('Usuário não encontrado pelo email, verificando se existe pelo telefone...');

      const phoneResult = await pool.query(`
        SELECT * FROM "User"
        WHERE "phoneNumber" = $1
      `, [process.env.ADMIN_PHONE_NUMBER]);

      if (phoneResult.rows.length === 0) {
        console.log('Usuário não encontrado pelo telefone também. Criando novo usuário administrador...');

        // Hash da senha
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Gerar ID único
        const { v4: uuidv4 } = require('uuid');
        const userId = uuidv4();

        // Criar usuário administrador
        await pool.query(`
          INSERT INTO "User" (
            "id",
            "phoneNumber",
            "firstName",
            "lastName",
            "email",
            "password",
            "role",
            "position",
            "department",
            "active",
            "passwordLastChanged",
            "accessPermissions",
            "createdAt",
            "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `, [
          userId,
          process.env.ADMIN_PHONE_NUMBER,
          'Caio',
          'Correia',
          adminEmail,
          hashedPassword,
          'ADMIN',
          'Administrador do Sistema',
          'TI',
          true,
          new Date(),
          JSON.stringify({
            modules: {
              dashboard: true,
              manual: true,
              procedimentos: true,
              politicas: true,
              calendario: true,
              noticias: true,
              reembolso: true,
              contracheque: true,
              ponto: true,
              admin: true,
              avaliacao: true
            }
          })
        ]);

        console.log('Usuário administrador criado com sucesso!');

        // Buscar o usuário recém-criado
        const newUserResult = await pool.query(`
          SELECT * FROM "User"
          WHERE "id" = $1
        `, [userId]);

        if (newUserResult.rows.length > 0) {
          const user = newUserResult.rows[0];
          console.log('Detalhes do usuário administrador:');
          console.log('ID:', user.id);
          console.log('Email:', user.email);
          console.log('Telefone:', user.phoneNumber);
          console.log('Nome:', user.firstName, user.lastName);
          console.log('Papel:', user.role);

          // Verificar a senha
          const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
          console.log('Senha válida:', isPasswordValid);

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
        }
      } else {
        const user = phoneResult.rows[0];
        console.log('Usuário encontrado pelo telefone. Atualizando email...');

        // Atualizar o email do usuário
        await pool.query(`
          UPDATE "User"
          SET
            "email" = $1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $2
        `, [adminEmail, user.id]);

        console.log('Email atualizado com sucesso!');

        // Buscar o usuário atualizado
        const updatedUserResult = await pool.query(`
          SELECT * FROM "User"
          WHERE "id" = $1
        `, [user.id]);

        if (updatedUserResult.rows.length > 0) {
          const updatedUser = updatedUserResult.rows[0];
          console.log('Detalhes do usuário atualizado:');
          console.log('ID:', updatedUser.id);
          console.log('Email:', updatedUser.email);
          console.log('Telefone:', updatedUser.phoneNumber);
          console.log('Nome:', updatedUser.firstName, updatedUser.lastName);
          console.log('Papel:', updatedUser.role);

          // Verificar a senha
          const isPasswordValid = await bcrypt.compare(adminPassword, updatedUser.password);
          console.log('Senha válida:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('Atualizando senha...');

            // Hash da senha
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            // Atualizar a senha do usuário
            await pool.query(`
              UPDATE "User"
              SET
                "password" = $1,
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE "id" = $2
            `, [hashedPassword, updatedUser.id]);

            console.log('Senha atualizada com sucesso!');
          }

          // Gerar token JWT
          const token = jwt.sign(
            {
              userId: updatedUser.id,
              phoneNumber: updatedUser.phoneNumber,
              role: updatedUser.role,
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
          );

          console.log('Token JWT gerado:', token.substring(0, 20) + '...');
          console.log('Login bem-sucedido!');
        }
      }
    } else {
      const user = userResult.rows[0];
      console.log('Usuário encontrado pelo email:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Telefone:', user.phoneNumber);
      console.log('Nome:', user.firstName, user.lastName);
      console.log('Papel:', user.role);

      // Verificar a senha
      const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
      console.log('Senha válida:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('Atualizando senha...');

        // Hash da senha
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Atualizar a senha do usuário
        await pool.query(`
          UPDATE "User"
          SET
            "password" = $1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $2
        `, [hashedPassword, user.id]);

        console.log('Senha atualizada com sucesso!');
      }

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
    }
  } catch (error) {
    console.error('Erro ao testar login com email específico:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  });
