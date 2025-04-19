// Script para criar o usuário administrador do zero
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Configurações
const MONGODB_URI = "mongodb+srv://apiabzgroup:Cli%40212202%40@abzpainel.dz8sggk.mongodb.net/?retryWrites=true&w=majority&appName=ABZPainel";
const ADMIN_PHONE = '+5522997847289';
const ADMIN_EMAIL = 'caio.correia@groupabz.com';
const ADMIN_PASSWORD = 'Caio@2122@';

async function createAdmin() {
  let client;
  
  try {
    // Conectar ao MongoDB
    console.log('Conectando ao MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Conectado ao MongoDB com sucesso!');
    
    // Acessar o banco de dados (será criado se não existir)
    const db = client.db('test');
    const usersCollection = db.collection('users');
    
    // Gerar hash da senha
    console.log('Gerando hash da senha...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    // Criar o usuário administrador
    console.log('Criando usuário administrador...');
    const adminUser = {
      phoneNumber: ADMIN_PHONE,
      firstName: 'Caio',
      lastName: 'Correia',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'ADMIN',
      position: 'Administrador do Sistema',
      department: 'TI',
      active: true,
      passwordLastChanged: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      accessPermissions: {
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
          admin: true
        }
      },
      accessHistory: [{
        timestamp: new Date(),
        action: 'CREATED',
        details: 'Usuário administrador criado pelo script'
      }]
    };
    
    // Verificar se o usuário já existe
    const existingUser = await usersCollection.findOne({ phoneNumber: ADMIN_PHONE });
    
    if (existingUser) {
      console.log('Usuário administrador já existe. Atualizando...');
      
      // Atualizar o usuário
      const result = await usersCollection.updateOne(
        { phoneNumber: ADMIN_PHONE },
        { $set: adminUser }
      );
      
      console.log('Usuário administrador atualizado:', result.modifiedCount > 0 ? 'Sucesso' : 'Falha');
    } else {
      console.log('Criando novo usuário administrador...');
      
      // Inserir o usuário
      const result = await usersCollection.insertOne(adminUser);
      
      console.log('Usuário administrador criado:', result.insertedId ? 'Sucesso' : 'Falha');
    }
    
    // Verificar se o usuário foi criado/atualizado
    const updatedUser = await usersCollection.findOne({ phoneNumber: ADMIN_PHONE });
    
    if (updatedUser) {
      console.log('\nUsuário administrador:');
      console.log('- ID:', updatedUser._id);
      console.log('- Telefone:', updatedUser.phoneNumber);
      console.log('- Email:', updatedUser.email);
      console.log('- Nome:', updatedUser.firstName, updatedUser.lastName);
      console.log('- Função:', updatedUser.role);
      console.log('- Senha (hash):', updatedUser.password);
      
      // Verificar a senha
      const isMatch = await bcrypt.compare(ADMIN_PASSWORD, updatedUser.password);
      console.log('Verificação da senha:', isMatch ? 'SENHA CORRETA' : 'SENHA INCORRETA');
    } else {
      console.log('Erro: Usuário administrador não encontrado após criação/atualização!');
    }
    
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
  } finally {
    // Fechar a conexão
    if (client) {
      await client.close();
      console.log('\nConexão com o MongoDB fechada.');
    }
  }
}

// Executar a função
createAdmin();
