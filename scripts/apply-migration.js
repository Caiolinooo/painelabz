/**
 * Script para aplicar a migração de tradução de cards
 * Este script adiciona as colunas de tradução à tabela Card
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Iniciando migração para adicionar campos de tradução aos cards...');

    // Executar as alterações no banco de dados
    const queries = [
      // Adicionar colunas de tradução
      prisma.$executeRaw`ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "titleEn" TEXT`,
      prisma.$executeRaw`ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT`,
      
      // Atualizar os cards existentes com valores padrão vazios
      prisma.$executeRaw`UPDATE "Card" SET "titleEn" = '' WHERE "titleEn" IS NULL`,
      prisma.$executeRaw`UPDATE "Card" SET "descriptionEn" = '' WHERE "descriptionEn" IS NULL`
    ];

    // Executar as queries em sequência
    for (const query of queries) {
      await query;
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a migração
applyMigration();
