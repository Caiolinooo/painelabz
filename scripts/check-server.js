// Script para verificar se o servidor está rodando
const http = require('http');

function checkServer() {
  console.log('Verificando se o servidor está rodando em http://localhost:3000...');
  
  const req = http.get('http://localhost:3000', (res) => {
    console.log(`Servidor respondeu com status: ${res.statusCode}`);
    console.log('Servidor está rodando!');
    process.exit(0);
  });
  
  req.on('error', (error) => {
    console.error('Erro ao conectar ao servidor:', error.message);
    console.log('Servidor não está rodando ou não está acessível.');
    process.exit(1);
  });
  
  req.setTimeout(5000, () => {
    console.error('Timeout ao conectar ao servidor');
    console.log('Servidor não está respondendo dentro do tempo limite.');
    req.destroy();
    process.exit(1);
  });
}

checkServer();
