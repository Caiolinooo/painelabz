// Script para testar a API fix-token na porta 3001
const fetch = require('node-fetch');

// Token de teste gerado pelo script generate-test-token.js
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjOWIxZTlhMi0zYzgwLTRiM2QtOWY3NS1mYzdhMDBkN2NkYmIiLCJlbWFpbCI6ImNhaW8uY29ycmVpYUBncm91cGFiei5jb20iLCJwaG9uZU51bWJlciI6Iis1NTIyOTk3ODQ3Mjg5Iiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNzQ1NTIwNzI0LCJleHAiOjE3NDYxMjU1MjR9.FcLG8NjcXza_NdKG2bf-i-hNY7FKp1dVk2zDFc7mLfM';

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
