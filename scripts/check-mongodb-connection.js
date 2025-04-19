/**
 * Script para verificar a conexão com o MongoDB
 * Este script tenta se conectar ao MongoDB e listar as coleções
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  console.log('Verificando conexão com o MongoDB...');
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Erro: MONGODB_URI não está definido no arquivo .env');
    process.exit(1);
  }
  
  const client = new MongoClient(uri);
  
  try {
    // Conectar ao MongoDB
    await client.connect();
    console.log('Conexão com o MongoDB estabelecida com sucesso!');
    
    // Obter o banco de dados
    const dbName = uri.split('/').pop().split('?')[0];
    console.log(`Banco de dados: ${dbName}`);
    const db = client.db(dbName);
    
    // Listar coleções
    const collections = await db.listCollections().toArray();
    console.log(`\nColeções disponíveis (${collections.length}):`);
    
    if (collections.length === 0) {
      console.log('  Nenhuma coleção encontrada.');
    } else {
      collections.forEach((collection, index) => {
        console.log(`  ${index + 1}. ${collection.name}`);
      });
    }
    
    // Verificar se há documentos em cada coleção
    console.log('\nVerificando documentos em cada coleção:');
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  ${collection.name}: ${count} documento(s)`);
    }
    
    console.log('\nVerificação concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Executar a função principal
main().catch(console.error);
