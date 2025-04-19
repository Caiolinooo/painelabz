/**
 * Script para testar a conexão com o MongoDB Atlas
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
  process.exit(1);
}

console.log(`${colors.cyan}> Tentando conectar ao MongoDB...${colors.reset}`);
console.log(`${colors.yellow}> String de conexão: ${MONGODB_URI}${colors.reset}`);

// Função para testar a conexão
async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`${colors.green}✓ Conexão com MongoDB estabelecida com sucesso!${colors.reset}`);
    
    // Verificar se o banco de dados está vazio
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    console.log(`${colors.cyan}> Coleções disponíveis:${colors.reset}`);
    if (collections.length === 0) {
      console.log(`${colors.yellow}  Nenhuma coleção encontrada.${colors.reset}`);
    } else {
      collections.forEach(collection => {
        console.log(`  - ${collection.name}`);
      });
    }
    
  } catch (error) {
    console.error(`${colors.red}✗ Erro ao conectar ao MongoDB:${colors.reset}`, error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log(`${colors.yellow}! Não foi possível resolver o nome do host. Verifique sua conexão com a internet.${colors.reset}`);
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log(`${colors.yellow}! A conexão expirou. Verifique sua conexão com a internet ou se o endereço do servidor está correto.${colors.reset}`);
    } else if (error.message.includes('Authentication failed')) {
      console.log(`${colors.yellow}! Falha na autenticação. Verifique se o nome de usuário e senha estão corretos.${colors.reset}`);
    } else if (error.message.includes('bad auth')) {
      console.log(`${colors.yellow}! Falha na autenticação. Verifique se a senha está correta.${colors.reset}`);
      console.log(`${colors.yellow}! Lembre-se que caracteres especiais na senha (como @) precisam ser codificados na string de conexão.${colors.reset}`);
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

// Executar o teste
testConnection();
