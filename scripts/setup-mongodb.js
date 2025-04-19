/**
 * Script para configurar e verificar a conexão com o MongoDB Atlas
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Cores para o console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// URL de conexão com o MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

// Verificar se a string de conexão foi fornecida
if (!MONGODB_URI) {
  console.error(`${colors.red}✗ A variável de ambiente MONGODB_URI não está definida${colors.reset}`);
  console.log(`${colors.yellow}Por favor, adicione a seguinte linha ao arquivo .env:${colors.reset}`);
  console.log(`MONGODB_URI="mongodb+srv://usuario:senha@cluster.mongodb.net/nome-do-banco"`);
  process.exit(1);
}

// Verificar se a string de conexão contém <db_password>
if (MONGODB_URI.includes('<db_password>')) {
  console.error(`${colors.red}✗ A senha do banco de dados não foi configurada${colors.reset}`);
  console.log(`${colors.yellow}Por favor, substitua <db_password> pela senha real no arquivo .env${colors.reset}`);
  process.exit(1);
}

// Verificar se o número de telefone do administrador está definido
const adminPhoneNumber = process.env.ADMIN_PHONE_NUMBER;
if (!adminPhoneNumber) {
  console.error(`${colors.red}✗ A variável de ambiente ADMIN_PHONE_NUMBER não está definida${colors.reset}`);
  console.log(`${colors.yellow}Por favor, adicione a seguinte linha ao arquivo .env:${colors.reset}`);
  console.log(`ADMIN_PHONE_NUMBER="+5511999999999"`);
  process.exit(1);
}

// Função para testar a conexão com o MongoDB
async function testConnection() {
  console.log(`\n${colors.bright}${colors.cyan}=== Verificando Conexão com MongoDB Atlas ===${colors.reset}\n`);

  try {
    console.log(`${colors.cyan}> Tentando conectar ao MongoDB...${colors.reset}`);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`${colors.green}✓ Conexão com MongoDB estabelecida com sucesso!${colors.reset}`);
    
    // Verificar se o banco de dados está vazio
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log(`\n${colors.yellow}! O banco de dados parece estar vazio.${colors.reset}`);
      console.log(`${colors.yellow}! Execute o comando abaixo para popular o banco de dados:${colors.reset}`);
      console.log(`${colors.cyan}npm run db:seed${colors.reset}\n`);
    } else {
      console.log(`\n${colors.green}✓ Banco de dados contém ${collections.length} coleções.${colors.reset}`);
      
      // Listar as coleções
      console.log(`${colors.cyan}> Coleções disponíveis:${colors.reset}`);
      collections.forEach(collection => {
        console.log(`  - ${collection.name}`);
      });
      
      console.log(`\n${colors.green}✓ Tudo parece estar configurado corretamente!${colors.reset}`);
    }
    
    console.log(`\n${colors.yellow}Para iniciar o servidor, execute:${colors.reset}`);
    console.log(`${colors.cyan}npm run dev${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}✗ Erro ao conectar ao MongoDB:${colors.reset}`, error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log(`\n${colors.yellow}! Não foi possível resolver o nome do host. Verifique sua conexão com a internet.${colors.reset}`);
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log(`\n${colors.yellow}! A conexão expirou. Verifique sua conexão com a internet ou se o endereço do servidor está correto.${colors.reset}`);
    } else if (error.message.includes('Authentication failed')) {
      console.log(`\n${colors.yellow}! Falha na autenticação. Verifique se o nome de usuário e senha estão corretos.${colors.reset}`);
    }
    
    process.exit(1);
  } finally {
    // Fechar a conexão
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log(`${colors.cyan}> Conexão com MongoDB fechada.${colors.reset}`);
    }
  }
}

// Executar o teste de conexão
testConnection();
