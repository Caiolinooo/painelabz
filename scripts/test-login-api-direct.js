// Script para testar o login com a API diretamente
require('dotenv').config();
const fetch = require('node-fetch');

async function main() {
  console.log('Testando login com a API diretamente...');

  const adminEmail = 'caio.correia@groupabz.com';
  const adminPassword = 'Caio@2122@';

  try {
    // Primeiro, iniciar o processo de login para verificar se o usuário tem senha
    console.log('Iniciando processo de login para verificar se o usuário tem senha...');

    const initResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminEmail,
      }),
    });

    const initData = await initResponse.json();

    console.log('Resposta da inicialização do login:', initData);

    if (initData.success && initData.hasPassword) {
      console.log('Usuário tem senha, tentando login com senha...');

      // Agora, fazer login com senha
      const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });

      const loginData = await loginResponse.json();

      console.log('Status da resposta de login:', loginResponse.status);
      console.log('Resposta do login:', loginData);

      if (loginResponse.ok && loginData.token) {
        console.log('Login realizado com sucesso!');
        console.log('Token JWT:', loginData.token.substring(0, 20) + '...');
        console.log('Usuário:', {
          id: loginData.user.id,
          email: loginData.user.email,
          phoneNumber: loginData.user.phoneNumber,
          role: loginData.user.role,
        });

        // Verificar o token
        console.log('Verificando token...');

        const verifyResponse = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
          },
        });

        const verifyData = await verifyResponse.json();

        console.log('Status da resposta de verificação:', verifyResponse.status);
        console.log('Resposta da verificação:', verifyData);

        if (verifyResponse.ok) {
          console.log('Token verificado com sucesso!');
        } else {
          console.error('Erro ao verificar token:', verifyData.error || 'Erro desconhecido');
        }
      } else {
        console.error('Erro ao fazer login:', loginData.error || 'Erro desconhecido');
      }
    } else {
      console.log('Usuário não tem senha ou ocorreu um erro na inicialização do login.');
    }
  } catch (error) {
    console.error('Erro ao testar login com a API:', error);
  }
}

main()
  .catch(error => {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  });
