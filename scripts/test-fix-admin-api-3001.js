// Script para testar a API fix-admin na porta 3001
const fetch = require('node-fetch');

async function testFixAdminAPI() {
  try {
    console.log('Testando API fix-admin na porta 3001...');
    
    const response = await fetch('http://localhost:3001/api/admin/fix-admin');
    console.log('Status da resposta:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('Dados da resposta:', data);
    
    if (response.ok) {
      console.log('API fix-admin funcionou corretamente!');
    } else {
      console.error('Erro na API fix-admin:', data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('Erro ao testar API fix-admin:', error);
  }
}

testFixAdminAPI();
