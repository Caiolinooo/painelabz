// Script para corrigir o problema de login
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function main() {
  console.log('Corrigindo problema de login...');

  const adminEmail = 'caio.correia@groupabz.com';
  const adminPassword = 'Caio@2122@';
  const adminPhone = '+5522997847289';

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
    const tableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'User'
      );
    `);

    const tableExists = tableResult.rows[0].exists;
    console.log('Tabela User existe:', tableExists);

    if (!tableExists) {
      console.log('Criando tabela User...');

      await pool.query(`
        CREATE TABLE "User" (
          "id" TEXT NOT NULL,
          "phoneNumber" TEXT,
          "firstName" TEXT,
          "lastName" TEXT,
          "name" TEXT,
          "email" TEXT,
          "password" TEXT,
          "role" TEXT,
          "position" TEXT,
          "avatar" TEXT,
          "department" TEXT,
          "verificationCode" TEXT,
          "verificationCodeExpires" TIMESTAMP,
          "inviteCode" TEXT,
          "inviteSent" BOOLEAN,
          "inviteSentAt" TIMESTAMP,
          "inviteAccepted" BOOLEAN,
          "inviteAcceptedAt" TIMESTAMP,
          "passwordLastChanged" TIMESTAMP,
          "active" BOOLEAN,
          "accessPermissions" JSONB,
          "accessHistory" JSONB,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "User_pkey" PRIMARY KEY ("id")
        );
      `);

      console.log('Tabela User criada com sucesso!');
    }

    // Verificar se o usuário administrador existe
    const userResult = await pool.query(`
      SELECT * FROM "User"
      WHERE "email" = $1 OR "phoneNumber" = $2
    `, [adminEmail, adminPhone]);

    if (userResult.rows.length === 0) {
      console.log('Usuário administrador não existe. Criando...');

      // Hash da senha
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Criar usuário administrador
      const userId = uuidv4();

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
          "accessHistory",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, [
        userId,
        adminPhone,
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
        }),
        JSON.stringify([{
          timestamp: new Date(),
          action: 'CREATED',
          details: 'Usuário administrador criado automaticamente'
        }])
      ]);

      console.log('Usuário administrador criado com sucesso!');
    } else {
      console.log('Usuário administrador já existe.');

      const user = userResult.rows[0];
      console.log('Detalhes do usuário administrador:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Telefone:', user.phoneNumber);
      console.log('Nome:', user.firstName, user.lastName);
      console.log('Papel:', user.role);

      // Verificar se o email e telefone estão corretos
      if (user.email !== adminEmail || user.phoneNumber !== adminPhone) {
        console.log('Atualizando email e telefone do usuário administrador...');

        await pool.query(`
          UPDATE "User"
          SET
            "email" = $1,
            "phoneNumber" = $2,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $3
        `, [adminEmail, adminPhone, user.id]);

        console.log('Email e telefone atualizados com sucesso!');
      }

      // Verificar se a senha está correta
      if (user.password) {
        const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
        console.log('Senha válida:', isPasswordValid);

        if (!isPasswordValid) {
          console.log('Atualizando senha do usuário administrador...');

          // Hash da senha
          const hashedPassword = await bcrypt.hash(adminPassword, 10);

          await pool.query(`
            UPDATE "User"
            SET
              "password" = $1,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $2
          `, [hashedPassword, user.id]);

          console.log('Senha atualizada com sucesso!');
        }
      } else {
        console.log('Usuário não possui senha. Definindo senha...');

        // Hash da senha
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await pool.query(`
          UPDATE "User"
          SET
            "password" = $1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $2
        `, [hashedPassword, user.id]);

        console.log('Senha definida com sucesso!');
      }

      // Verificar se o usuário é administrador
      if (user.role !== 'ADMIN') {
        console.log('Atualizando papel do usuário para ADMIN...');

        await pool.query(`
          UPDATE "User"
          SET
            "role" = 'ADMIN',
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
        `, [user.id]);

        console.log('Papel atualizado com sucesso!');
      }

      // Verificar se o usuário está ativo
      if (!user.active) {
        console.log('Ativando usuário administrador...');

        await pool.query(`
          UPDATE "User"
          SET
            "active" = true,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
        `, [user.id]);

        console.log('Usuário ativado com sucesso!');
      }

      // Verificar se o usuário tem permissões de acesso
      if (!user.accessPermissions || !user.accessPermissions.modules) {
        console.log('Definindo permissões de acesso para o usuário administrador...');

        await pool.query(`
          UPDATE "User"
          SET
            "accessPermissions" = $1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $2
        `, [JSON.stringify({
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
        }), user.id]);

        console.log('Permissões de acesso definidas com sucesso!');
      }
    }

    // Verificar se o usuário pode fazer login
    console.log('Verificando se o usuário pode fazer login...');

    const loginResult = await pool.query(`
      SELECT * FROM "User"
      WHERE "email" = $1
    `, [adminEmail]);

    if (loginResult.rows.length > 0) {
      const user = loginResult.rows[0];

      // Verificar a senha
      const isPasswordValid = await bcrypt.compare(adminPassword, user.password);
      console.log('Senha válida:', isPasswordValid);

      if (isPasswordValid) {
        console.log('Usuário pode fazer login com sucesso!');
      } else {
        console.log('Senha incorreta. Verifique a senha.');
      }
    } else {
      console.log('Usuário não encontrado pelo email. Verifique o email.');
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

    console.log('Problema de login corrigido com sucesso!');
  } catch (error) {
    console.error('Erro ao corrigir problema de login:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a correção:', error);
    process.exit(1);
  });
