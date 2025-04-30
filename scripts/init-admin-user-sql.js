// Script para inicializar o usuário administrador usando SQL direto
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Função para obter permissões padrão com base no papel
function getDefaultPermissions(role) {
  const defaultPermissions = {
    ADMIN: {
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
    }
  };

  return defaultPermissions[role];
}

async function main() {
  console.log('Inicializando usuário administrador usando SQL direto...');
  
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.ADMIN_LAST_NAME || 'ABZ';
  
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
    // Hash da senha
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Verificar se a tabela User existe
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('Tabela User não existe, criando...');
      
      // Criar tabela User
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL,
          "phoneNumber" TEXT NOT NULL,
          "firstName" TEXT,
          "lastName" TEXT,
          "name" TEXT,
          "email" TEXT,
          "password" TEXT,
          "role" TEXT NOT NULL DEFAULT 'USER',
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
          "active" BOOLEAN NOT NULL DEFAULT true,
          "accessPermissions" JSONB,
          "accessHistory" JSONB,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "User_phoneNumber_key" UNIQUE ("phoneNumber"),
          CONSTRAINT "User_email_key" UNIQUE ("email")
        );
      `);
      
      console.log('Tabela User criada com sucesso!');
    }
    
    // Verificar se o usuário admin já existe
    const userCheckResult = await pool.query(`
      SELECT * FROM "User" 
      WHERE "phoneNumber" = $1 OR "email" = $2
    `, [adminPhone, adminEmail]);
    
    const adminExists = userCheckResult.rows.length > 0;
    
    if (adminExists) {
      console.log('Usuário administrador já existe, atualizando...');
      
      const adminId = userCheckResult.rows[0].id;
      
      await pool.query(`
        UPDATE "User"
        SET 
          "firstName" = $1,
          "lastName" = $2,
          "email" = $3,
          "phoneNumber" = $4,
          "password" = $5,
          "role" = 'ADMIN',
          "position" = 'Administrador do Sistema',
          "department" = 'TI',
          "active" = true,
          "passwordLastChanged" = CURRENT_TIMESTAMP,
          "accessPermissions" = $6,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $7
      `, [
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPhone,
        hashedPassword,
        JSON.stringify(getDefaultPermissions('ADMIN')),
        adminId
      ]);
      
      console.log('Usuário administrador atualizado com sucesso!');
    } else {
      console.log('Criando usuário administrador...');
      
      const adminId = uuidv4();
      
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
          "accessPermissions",
          "accessHistory",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'ADMIN', 'Administrador do Sistema', 'TI', true, 
          CURRENT_TIMESTAMP, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, [
        adminId,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPhone,
        hashedPassword,
        JSON.stringify(getDefaultPermissions('ADMIN')),
        JSON.stringify([{
          timestamp: new Date(),
          action: 'CREATED',
          details: 'Usuário administrador criado pelo script de inicialização'
        }])
      ]);
      
      console.log('Usuário administrador criado com sucesso!');
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar usuário administrador:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a inicialização:', error);
    process.exit(1);
  });
