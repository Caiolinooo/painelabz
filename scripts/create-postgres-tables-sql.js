// Script para criar as tabelas no PostgreSQL diretamente usando SQL
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  console.log('Criando tabelas no PostgreSQL usando SQL direto...');

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
    // Criar tabela SiteConfig
    console.log('Criando tabela SiteConfig...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "SiteConfig" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "logo" TEXT NOT NULL,
        "favicon" TEXT NOT NULL,
        "primaryColor" TEXT NOT NULL,
        "secondaryColor" TEXT NOT NULL,
        "companyName" TEXT NOT NULL,
        "contactEmail" TEXT NOT NULL,
        "footerText" TEXT NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL,

        CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Tabela SiteConfig criada com sucesso!');

    // Criar tabela Card
    console.log('Criando tabela Card...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Card" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "href" TEXT NOT NULL,
        "icon" TEXT NOT NULL,
        "color" TEXT NOT NULL,
        "hoverColor" TEXT NOT NULL,
        "external" BOOLEAN NOT NULL DEFAULT false,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "order" INTEGER NOT NULL,
        "adminOnly" BOOLEAN NOT NULL DEFAULT false,
        "managerOnly" BOOLEAN NOT NULL DEFAULT false,
        "allowedRoles" JSONB,
        "allowedUserIds" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL,

        CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Tabela Card criada com sucesso!');

    // Criar tabela MenuItem
    console.log('Criando tabela MenuItem...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "MenuItem" (
        "id" TEXT NOT NULL,
        "href" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "icon" TEXT NOT NULL,
        "external" BOOLEAN NOT NULL DEFAULT false,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "order" INTEGER NOT NULL,
        "adminOnly" BOOLEAN NOT NULL DEFAULT false,
        "managerOnly" BOOLEAN NOT NULL DEFAULT false,
        "allowedRoles" JSONB,
        "allowedUserIds" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL,

        CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Tabela MenuItem criada com sucesso!');

    // Criar tabela Document
    console.log('Criando tabela Document...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Document" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "language" TEXT NOT NULL,
        "file" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "order" INTEGER NOT NULL,
        "adminOnly" BOOLEAN NOT NULL DEFAULT false,
        "managerOnly" BOOLEAN NOT NULL DEFAULT false,
        "allowedRoles" JSONB,
        "allowedUserIds" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL,

        CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Tabela Document criada com sucesso!');

    // Criar tabela News
    console.log('Criando tabela News...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "News" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "date" TIMESTAMP NOT NULL,
        "file" TEXT,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "featured" BOOLEAN NOT NULL DEFAULT false,
        "category" TEXT NOT NULL,
        "author" TEXT NOT NULL,
        "thumbnail" TEXT,
        "coverImage" TEXT,
        "tags" JSONB,
        "adminOnly" BOOLEAN NOT NULL DEFAULT false,
        "managerOnly" BOOLEAN NOT NULL DEFAULT false,
        "allowedRoles" JSONB,
        "allowedUserIds" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL,

        CONSTRAINT "News_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Tabela News criada com sucesso!');

    // Criar tabela Reimbursement
    console.log('Criando tabela Reimbursement...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Reimbursement" (
        "id" TEXT NOT NULL,
        "nome" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "telefone" TEXT NOT NULL,
        "cpf" TEXT NOT NULL,
        "cargo" TEXT NOT NULL,
        "centroCusto" TEXT NOT NULL,
        "data" TIMESTAMP NOT NULL,
        "tipoReembolso" TEXT NOT NULL,
        "iconeReembolso" TEXT,
        "descricao" TEXT NOT NULL,
        "valorTotal" TEXT NOT NULL,
        "moeda" TEXT NOT NULL DEFAULT 'BRL',
        "metodoPagamento" TEXT NOT NULL,
        "banco" TEXT,
        "agencia" TEXT,
        "conta" TEXT,
        "pixTipo" TEXT,
        "pixChave" TEXT,
        "comprovantes" JSONB NOT NULL,
        "observacoes" TEXT,
        "protocolo" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pendente',
        "dataCriacao" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dataAtualizacao" TIMESTAMP NOT NULL,
        "historico" JSONB NOT NULL,

        CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Reimbursement_protocolo_key" UNIQUE ("protocolo")
      );
    `);
    console.log('Tabela Reimbursement criada com sucesso!');

    // Criar tabela AuthorizedUser
    console.log('Criando tabela AuthorizedUser...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AuthorizedUser" (
        "id" TEXT NOT NULL,
        "email" TEXT,
        "phoneNumber" TEXT,
        "inviteCode" TEXT,
        "domain" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "expiresAt" TIMESTAMP,
        "maxUses" INTEGER,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "createdBy" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL,

        CONSTRAINT "AuthorizedUser_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "AuthorizedUser_email_key" UNIQUE ("email"),
        CONSTRAINT "AuthorizedUser_phoneNumber_key" UNIQUE ("phoneNumber"),
        CONSTRAINT "AuthorizedUser_inviteCode_key" UNIQUE ("inviteCode")
      );
    `);
    console.log('Tabela AuthorizedUser criada com sucesso!');

    console.log('Todas as tabelas foram criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  } finally {
    await pool.end();
  }
}

main()
  .catch(error => {
    console.error('Erro durante a criação das tabelas:', error);
    process.exit(1);
  });
