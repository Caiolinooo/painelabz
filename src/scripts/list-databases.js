// Script para listar os bancos de dados e coleções
const { MongoClient } = require('mongodb');

// Configurações
const MONGODB_URI = "mongodb+srv://apiabzgroup:Cli%40212202%40@abzpainel.dz8sggk.mongodb.net/?retryWrites=true&w=majority&appName=ABZPainel";

async function listDatabases() {
  let client;
  
  try {
    // Conectar ao MongoDB
    console.log('Conectando ao MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Conectado ao MongoDB com sucesso!');
    
    // Listar bancos de dados
    console.log('\nBancos de dados disponíveis:');
    const databasesList = await client.db().admin().listDatabases();
    databasesList.databases.forEach(db => {
      console.log(`- ${db.name}`);
    });
    
    // Verificar se o banco de dados 'abzpainel' existe
    const abzpainelExists = databasesList.databases.some(db => db.name === 'abzpainel');
    
    if (abzpainelExists) {
      // Listar coleções no banco de dados 'abzpainel'
      console.log('\nColeções no banco de dados abzpainel:');
      const db = client.db('abzpainel');
      const collections = await db.listCollections().toArray();
      
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
      
      // Verificar se a coleção 'users' existe
      const usersExists = collections.some(collection => collection.name === 'users');
      
      if (usersExists) {
        // Contar documentos na coleção 'users'
        const usersCount = await db.collection('users').countDocuments();
        console.log(`\nNúmero de documentos na coleção users: ${usersCount}`);
        
        // Listar os primeiros 5 usuários
        if (usersCount > 0) {
          console.log('\nPrimeiros usuários:');
          const users = await db.collection('users').find().limit(5).toArray();
          
          users.forEach((user, index) => {
            console.log(`\nUsuário ${index + 1}:`);
            console.log(`- ID: ${user._id}`);
            console.log(`- Telefone: ${user.phoneNumber || 'N/A'}`);
            console.log(`- Email: ${user.email || 'N/A'}`);
            console.log(`- Nome: ${user.firstName || ''} ${user.lastName || ''}`);
            console.log(`- Função: ${user.role || 'N/A'}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Erro ao listar bancos de dados:', error);
  } finally {
    // Fechar a conexão
    if (client) {
      await client.close();
      console.log('\nConexão com o MongoDB fechada.');
    }
  }
}

// Executar a função
listDatabases();
