// Script para testar o login
require('dotenv').config();
const fetch = require('node-fetch');

async function main() {
  console.log('Testando login com o usuário administrador...');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('Variáveis de ambiente ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórias');
    process.exit(1);
  }

  try {
    console.log(`Tentando login com email: ${adminEmail}`);
    console.log(`Senha: ${adminPassword.substring(0, 3)}...`);

    const requestBody = {
      phoneNumber: process.env.ADMIN_PHONE_NUMBER,
      password: adminPassword,
    };

    console.log('Corpo da requisição:', JSON.stringify(requestBody));

    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('Status da resposta:', response.status);
    console.log('Resposta do servidor:', data);

    if (response.ok && data.success) {
      console.log('Login realizado com sucesso!');
      console.log('Token JWT:', data.token.substring(0, 20) + '...');
      console.log('Usuário:', {
        id: data.user.id,
        email: data.user.email,
        phoneNumber: data.user.phoneNumber,
        role: data.user.role,
      });
    } else {
      console.error('Erro ao fazer login:', data.message || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
  }
}

main()
  .catch(error => {
    console.error('Erro durante o teste:', error);
    process.exit(1);
  });
