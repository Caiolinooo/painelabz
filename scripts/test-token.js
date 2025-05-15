/**
 * Script para testar o token de administrador
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Obter configurações do arquivo .env
const JWT_SECRET = process.env.JWT_SECRET;

// Verificar se JWT_SECRET está definido
if (!JWT_SECRET) {
  console.error('Erro: JWT_SECRET não está definido no arquivo .env');
  process.exit(1);
}

// Ler token do arquivo
let token;
try {
  token = fs.readFileSync('.token', 'utf8').trim();
  console.log('Token lido do arquivo .token');
} catch (error) {
  console.error('Erro ao ler token do arquivo:', error.message);
  process.exit(1);
}

// Verificar token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  
  console.log('Token válido!');
  console.log('Informações do token:');
  console.log('ID do usuário:', decoded.userId);
  console.log('Email:', decoded.email);
  console.log('Telefone:', decoded.phoneNumber);
  console.log('Papel:', decoded.role);
  console.log('Emitido em:', new Date(decoded.iat * 1000).toLocaleString());
  console.log('Expira em:', new Date(decoded.exp * 1000).toLocaleString());
  
  // Verificar se o token está expirado
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) {
    console.log('\nATENÇÃO: Token expirado!');
  } else {
    const remainingTime = decoded.exp - now;
    const days = Math.floor(remainingTime / (24 * 60 * 60));
    const hours = Math.floor((remainingTime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
    
    console.log(`\nToken válido por mais ${days} dias, ${hours} horas e ${minutes} minutos`);
  }
  
  // Gerar código para usar o token
  console.log('\nComo usar o token:');
  console.log('\n1. No localStorage do navegador:');
  console.log('localStorage.setItem('token', "' + token + '");');
  
  console.log('\n2. Em requisições fetch:');
  console.log(`
fetch('/api/endpoint', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));
  `);
  
  console.log('\n3. Em requisições Axios:');
  console.log(`
axios.get('/api/endpoint', {
  headers: {
    'Authorization': 'Bearer ${token}'
  }
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
  `);
  
} catch (error) {
  console.error('Token inválido:', error.message);
  process.exit(1);
}
