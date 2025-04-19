/**
 * Script para migrar dados do PostgreSQL para o MongoDB
 * Este script extrai dados do PostgreSQL e os insere no MongoDB
 * 
 * NOTA: Este script só deve ser executado se você ainda tiver dados no PostgreSQL
 * que precisam ser migrados para o MongoDB.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { Client } = require('pg');
const readline = require('readline');

// Criar interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para perguntar ao usuário
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Função principal
async function main() {
  console.log('=== Migração de dados do PostgreSQL para o MongoDB ===');
  
  // Verificar se as variáveis de ambiente estão definidas
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Erro: MONGODB_URI não está definido no arquivo .env');
    process.exit(1);
  }
  
  // Solicitar a URL do PostgreSQL
  console.log('\nATENÇÃO: Este script migrará dados do PostgreSQL para o MongoDB.');
  console.log('Certifique-se de ter um backup dos dados antes de continuar.\n');
  
  const postgresUrl = await askQuestion('Digite a URL de conexão do PostgreSQL (ou pressione Enter para usar a variável DATABASE_URL): ');
  const pgUrl = postgresUrl || process.env.DATABASE_URL;
  
  if (!pgUrl) {
    console.error('Erro: URL do PostgreSQL não fornecida');
    rl.close();
    process.exit(1);
  }
  
  // Confirmar a migração
  const confirmation = await askQuestion('\nIsso migrará TODOS os dados do PostgreSQL para o MongoDB. Continuar? (s/N): ');
  if (confirmation.toLowerCase() !== 's') {
    console.log('Migração cancelada pelo usuário.');
    rl.close();
    process.exit(0);
  }
  
  // Conectar ao PostgreSQL
  const pgClient = new Client({
    connectionString: pgUrl,
  });
  
  // Conectar ao MongoDB
  const mongoClient = new MongoClient(mongoUri);
  
  try {
    // Conectar ao PostgreSQL
    await pgClient.connect();
    console.log('Conectado ao PostgreSQL com sucesso!');
    
    // Conectar ao MongoDB
    await mongoClient.connect();
    console.log('Conectado ao MongoDB com sucesso!');
    
    // Obter o banco de dados MongoDB
    const dbName = mongoUri.split('/').pop().split('?')[0];
    const mongodb = mongoClient.db(dbName);
    
    // Listar tabelas do PostgreSQL
    const tablesResult = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`\nTabelas encontradas no PostgreSQL (${tables.length}):`, tables);
    
    if (tables.length === 0) {
      console.log('Nenhuma tabela encontrada no PostgreSQL. Nada para migrar.');
      return;
    }
    
    // Migrar cada tabela
    for (const table of tables) {
      console.log(`\n=== Migrando tabela: ${table} ===`);
      
      // Obter dados da tabela
      const dataResult = await pgClient.query(`SELECT * FROM "${table}"`);
      const rows = dataResult.rows;
      
      console.log(`Encontrados ${rows.length} registros na tabela ${table}`);
      
      if (rows.length === 0) {
        console.log(`Tabela ${table} está vazia. Pulando...`);
        continue;
      }
      
      // Converter IDs para o formato do MongoDB
      const convertedRows = rows.map(row => {
        // Converter id para _id
        if (row.id) {
          row._id = row.id;
          delete row.id;
        }
        
        // Converter datas para objetos Date
        Object.keys(row).forEach(key => {
          if (row[key] instanceof Date) {
            // Manter como Date
          } else if (typeof row[key] === 'string' && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(row[key])) {
            row[key] = new Date(row[key]);
          }
        });
        
        return row;
      });
      
      // Inserir no MongoDB
      try {
        // Verificar se a coleção já existe
        const collections = await mongodb.listCollections({ name: table }).toArray();
        if (collections.length > 0) {
          const existingCount = await mongodb.collection(table).countDocuments();
          console.log(`Coleção ${table} já existe com ${existingCount} documentos.`);
          
          // Perguntar se deseja substituir
          const replaceConfirm = await askQuestion(`Deseja substituir a coleção ${table} existente? (s/N): `);
          if (replaceConfirm.toLowerCase() === 's') {
            await mongodb.collection(table).drop();
            console.log(`Coleção ${table} existente foi removida.`);
          } else {
            console.log(`Pulando migração da tabela ${table}...`);
            continue;
          }
        }
        
        // Inserir dados
        const result = await mongodb.collection(table).insertMany(convertedRows);
        console.log(`Migrados ${result.insertedCount} registros para a coleção ${table} no MongoDB.`);
      } catch (error) {
        console.error(`Erro ao migrar tabela ${table}:`, error);
      }
    }
    
    console.log('\n=== Migração concluída com sucesso! ===');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    // Fechar conexões
    await pgClient.end();
    await mongoClient.close();
    rl.close();
  }
}

// Executar a função principal
main().catch(error => {
  console.error('Erro fatal durante a migração:', error);
  process.exit(1);
});
