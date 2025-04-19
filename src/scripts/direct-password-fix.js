// Script para corrigir diretamente a senha do administrador
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Configurações
const MONGODB_URI = "mongodb+srv://apiabzgroup:Cli%40212202%40@abzpainel.dz8sggk.mongodb.net/?retryWrites=true&w=majority&appName=ABZPainel";
const ADMIN_PHONE = '+5522997847289';
const ADMIN_PASSWORD = 'Caio@2122@';

async function fixPassword() {
  let client;
  
  try {
    // Conectar ao MongoDB
    console.log('Conectando ao MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Conectado ao MongoDB com sucesso!');
    
    // Acessar o banco de dados e a coleção
    const db = client.db('abzpainel');
    const usersCollection = db.collection('users');
    
    // Buscar o usuário administrador
    console.log(`Buscando usuário com telefone: ${ADMIN_PHONE}`);
    const adminUser = await usersCollection.findOne({ phoneNumber: ADMIN_PHONE });
    
    if (!adminUser) {
      console.log('Usuário administrador não encontrado!');
      return;
    }
    
    console.log('Usuário administrador encontrado:');
    console.log('- ID:', adminUser._id);
    console.log('- Nome:', adminUser.firstName, adminUser.lastName);
    console.log('- Email:', adminUser.email);
    
    // Gerar hash da senha
    console.log('\nGerando hash da senha...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    console.log('Hash gerado:', hashedPassword);
    
    // Atualizar a senha
    console.log('\nAtualizando a senha...');
    const result = await usersCollection.updateOne(
      { phoneNumber: ADMIN_PHONE },
      { 
        $set: { 
          password: hashedPassword,
          passwordLastChanged: new Date()
        } 
      }
    );
    
    console.log('Resultado da atualização:', result.modifiedCount > 0 ? 'Sucesso' : 'Falha');
    
    // Verificar a senha
    console.log('\nVerificando a senha...');
    const updatedUser = await usersCollection.findOne({ phoneNumber: ADMIN_PHONE });
    console.log('Nova senha (hash):', updatedUser.password);
    
    // Verificar manualmente
    const isMatch = await bcrypt.compare(ADMIN_PASSWORD, updatedUser.password);
    console.log('Verificação manual da senha:', isMatch ? 'SENHA CORRETA' : 'SENHA INCORRETA');
    
  } catch (error) {
    console.error('Erro ao corrigir a senha:', error);
  } finally {
    // Fechar a conexão
    if (client) {
      await client.close();
      console.log('\nConexão com o MongoDB fechada.');
    }
  }
}

// Executar a função
fixPassword();
