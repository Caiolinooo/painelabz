// Script para testar a conexão com o PostgreSQL
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testando conexão com o PostgreSQL...');
  console.log('String de conexão:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@'));

  try {
    // Testar a conexão executando uma consulta simples
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Conexão com PostgreSQL estabelecida com sucesso!');
    console.log('Resultado da consulta:', result);

    // Listar as tabelas existentes
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    console.log('Tabelas existentes no banco de dados:');
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada.');
    } else {
      tables.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    }

    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar com PostgreSQL:', error);
    console.log('Teste concluído com erro.');
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(error => {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  });
