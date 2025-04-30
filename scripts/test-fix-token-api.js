// Script para testar a API fix-token
const fetch = require('node-fetch');

// Token de teste (substitua por um token válido se necessário)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjOWIxZTlhMi0zYzgwLTRiM2QtOWY3NS1mYzdhMDBkN2NkYmIiLCJlbWFpbCI6ImNhaW8uY29ycmVpYUBncm91cGFiei5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3MTM5OTU5OTksImV4cCI6MTcxNDYwMDc5OX0.8OYE8Dg3haAxQ7p3MUiLJE_wiy2rCKsWiszMVwwo1LI';

async function testFixTokenAPI() {
  try {
    console.log('Testando API fix-token...');
    
    const response = await fetch('http://localhost:3000/api/auth/fix-token', {
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
