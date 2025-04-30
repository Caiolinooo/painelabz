/**
 * Script para gerar um token de administrador diretamente
 * sem depender do banco de dados ou do Supabase
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Obter configurações do arquivo .env
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const ADMIN_PHONE_NUMBER = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Caio';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Correia';

// Verificar se JWT_SECRET está definido
if (!JWT_SECRET) {
  console.error('Erro: JWT_SECRET não está definido no arquivo .env');
  process.exit(1);
}

// Gerar um ID de usuário se não for fornecido
const ADMIN_ID = process.env.ADMIN_ID || uuidv4();

// Criar payload do token
const payload = {
  userId: ADMIN_ID,
  email: ADMIN_EMAIL,
  phoneNumber: ADMIN_PHONE_NUMBER,
  role: 'ADMIN',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 dias
};

// Gerar token JWT
const token = jwt.sign(payload, JWT_SECRET);

// Salvar token em um arquivo
fs.writeFileSync('.token', token);

// Exibir informações
console.log('Token de administrador gerado com sucesso!');
console.log('ID do usuário:', ADMIN_ID);
console.log('Email:', ADMIN_EMAIL);
console.log('Telefone:', ADMIN_PHONE_NUMBER);
console.log('Nome completo:', `${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}`);
console.log('Papel:', 'ADMIN');
console.log('Validade:', '30 dias');
console.log('\nToken JWT:');
console.log(token);
console.log('\nToken salvo no arquivo .token');

// Criar um arquivo HTML para testar o token
const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Token de Administrador</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .token-container {
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin: 20px 0;
      overflow-wrap: break-word;
    }
    .success {
      color: green;
      font-weight: bold;
    }
    .button {
      background-color: #0066cc;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      margin-right: 10px;
    }
    .info {
      margin-bottom: 20px;
    }
    .info div {
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <h1>Token de Administrador</h1>

  <div class="info">
    <div><strong>ID do usuário:</strong> ${ADMIN_ID}</div>
    <div><strong>Email:</strong> ${ADMIN_EMAIL}</div>
    <div><strong>Telefone:</strong> ${ADMIN_PHONE_NUMBER}</div>
    <div><strong>Nome completo:</strong> ${ADMIN_FIRST_NAME} ${ADMIN_LAST_NAME}</div>
    <div><strong>Papel:</strong> ADMIN</div>
    <div><strong>Validade:</strong> 30 dias</div>
  </div>

  <h2>Token JWT</h2>
  <div class="token-container" id="token">${token}</div>

  <button class="button" onclick="copyToken()">Copiar Token</button>
  <button class="button" onclick="saveToLocalStorage()">Salvar no localStorage</button>
  <button class="button" onclick="verifyToken()">Verificar Token</button>

  <div id="message"></div>

  <div id="verification-result" style="margin-top: 20px;"></div>

  <script>
    function copyToken() {
      const tokenElement = document.getElementById('token');
      const range = document.createRange();
      range.selectNode(tokenElement);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();

      const message = document.getElementById('message');
      message.innerHTML = '<p class="success">Token copiado para a área de transferência!</p>';
      setTimeout(() => {
        message.innerHTML = '';
      }, 3000);
    }

    function saveToLocalStorage() {
      const token = document.getElementById('token').textContent;
      localStorage.setItem('token', token);

      const message = document.getElementById('message');
      message.innerHTML = '<p class="success">Token salvo no localStorage!</p>';
      setTimeout(() => {
        message.innerHTML = '';
      }, 3000);
    }

    async function verifyToken() {
      const token = document.getElementById('token').textContent;
      const resultElement = document.getElementById('verification-result');

      resultElement.innerHTML = '<p>Verificando token...</p>';

      try {
        const response = await fetch('/api/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.valid) {
          resultElement.innerHTML = \`
            <h3 style="color: green;">Token Válido!</h3>
            <div style="background-color: #f0f8f0; padding: 10px; border-radius: 5px; margin-top: 10px;">
              <pre style="white-space: pre-wrap;">\${JSON.stringify(data.decoded, null, 2)}</pre>
            </div>
          \`;
        } else {
          resultElement.innerHTML = \`
            <h3 style="color: red;">Token Inválido</h3>
            <div style="background-color: #f8f0f0; padding: 10px; border-radius: 5px; margin-top: 10px;">
              <p><strong>Erro:</strong> \${data.error}</p>
              \${data.details ? \`<p><strong>Detalhes:</strong> \${data.details}</p>\` : ''}
            </div>
          \`;
        }
      } catch (error) {
        resultElement.innerHTML = \`
          <h3 style="color: red;">Erro ao verificar token</h3>
          <div style="background-color: #f8f0f0; padding: 10px; border-radius: 5px; margin-top: 10px;">
            <p>\${error.message || 'Erro desconhecido'}</p>
          </div>
        \`;
      }
    }
  </script>
</body>
</html>
`;

// Salvar o arquivo HTML
fs.writeFileSync('public/admin-token.html', htmlContent);
console.log('Página HTML para testar o token salva em public/admin-token.html');
