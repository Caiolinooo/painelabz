// Script para testar a API fix-token na porta 3001
const fetch = require('node-fetch');

// Token de teste gerado pelo script generate-test-token.js
const token = '***REMOVED***';

async function testFixTokenAPI() {
  try {
    console.log('Testando API fix-token na porta 3001...');

    const response = await fetch('http://localhost:3001/api/auth/fix-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Status da resposta:', response.status, response.statusText);

    const data = await response.json();
    console.log('Dados da resposta:', data);

    if (response.ok) {
      console.log('API fix-token funcionou corretamente!');
    } else {
      console.error('Erro na API fix-token:', data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('Erro ao testar API fix-token:', error);
  }
}

testFixTokenAPI();
