// Script para testar o login diretamente com a API HTTP
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function main() {
  console.log('Testando login direto com a API HTTP...');
  
  const adminEmail = 'caio.correia@groupabz.com';
  const adminPassword = 'Caio@2122@';
  
  try {
    // Fazer login diretamente com a API
    console.log('Fazendo login com email e senha...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Login bem-sucedido!');
      console.log('Token:', data.token ? data.token.substring(0, 20) + '...' : 'Não gerado');
      console.log('Usuário:', {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
      });
    } else {
      console.error('Erro no login:', response.status);
      console.error('Detalhes:', data);
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
  }
}

main()
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
