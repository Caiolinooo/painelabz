// Script para verificar e corrigir o armazenamento de tokens no frontend
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const tokenName = process.env.NEXT_PUBLIC_TOKEN_NAME || 'token';

// Verificar configurações
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

if (!jwtSecret) {
  console.error('Erro: JWT_SECRET deve estar definido no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase
console.log('Criando cliente Supabase com URL:', supabaseUrl);
console.log('Chave de serviço presente:', supabaseServiceKey ? 'Sim' : 'Não');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para gerar um token JWT para o administrador
function generateAdminToken(userId, phoneNumber) {
  try {
    const payload = {
      userId,
      phoneNumber,
      role: 'ADMIN'
    };

    return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  } catch (error) {
    console.error('Erro ao gerar token:', error.message);
    return null;
  }
}

// Função principal
async function fixTokenStorage() {
  try {
    console.log('Iniciando verificação e correção do armazenamento de tokens...');
    
    // Verificar se o usuário administrador existe
    console.log('\n1. Verificando usuário administrador...');
    
    // Tentar buscar pelo email
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    let user = null;
    
    if (adminError) {
      console.error('Erro ao buscar usuário administrador pelo email:', adminError.message);
      
      // Tentar pelo telefone
      const { data: adminByPhone, error: phoneError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', adminPhone)
        .single();
      
      if (phoneError) {
        console.error('Erro ao buscar usuário administrador pelo telefone:', phoneError.message);
        console.error('Usuário administrador não encontrado. Execute o script fix-admin-user.js primeiro.');
        process.exit(1);
      } else {
        console.log('Usuário administrador encontrado pelo telefone:', adminByPhone.id);
        user = adminByPhone;
      }
    } else {
      console.log('Usuário administrador encontrado pelo email:', adminUser.id);
      user = adminUser;
    }
    
    // Gerar token para o administrador
    const token = generateAdminToken(user.id, user.phone_number);
    
    if (!token) {
      console.error('Erro ao gerar token para o administrador.');
      process.exit(1);
    }
    
    console.log('Token gerado com sucesso para o administrador');
    
    // Verificar configuração do token no .env
    console.log('\n2. Verificando configuração do token no .env...');
    console.log('Nome do token configurado:', tokenName);
    
    if (tokenName !== 'token') {
      console.log('Atenção: O nome do token configurado é diferente de "token".');
      console.log('Isso pode causar problemas de autenticação se o frontend estiver usando "token".');
      console.log('Considere alterar NEXT_PUBLIC_TOKEN_NAME para "token" no arquivo .env.');
    }
    
    // Gerar HTML para teste de token
    console.log('\n3. Gerando HTML para teste de token...');
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste de Token</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .success {
      color: green;
      font-weight: bold;
    }
    .error {
      color: red;
      font-weight: bold;
    }
    button {
      background-color: #0066cc;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    button:hover {
      background-color: #0055aa;
    }
    pre {
      background-color: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <h1>Teste de Token</h1>
  
  <div class="card">
    <h2>Token Atual</h2>
    <div id="current-token-info"></div>
    <pre id="current-token-data"></pre>
    <button onclick="checkCurrentToken()">Verificar Token Atual</button>
    <button onclick="clearToken()">Limpar Token</button>
  </div>
  
  <div class="card">
    <h2>Novo Token de Administrador</h2>
    <p>Use este token para autenticar como administrador:</p>
    <pre id="admin-token">${token}</pre>
    <button onclick="saveAdminToken()">Salvar Token de Administrador</button>
  </div>
  
  <div class="card">
    <h2>Verificar Token Personalizado</h2>
    <textarea id="custom-token" rows="5" style="width: 100%; margin-bottom: 10px;" placeholder="Cole um token JWT aqui para verificar"></textarea>
    <button onclick="verifyCustomToken()">Verificar Token</button>
    <div id="custom-token-result" class="hidden">
      <h3>Resultado:</h3>
      <pre id="custom-token-data"></pre>
    </div>
  </div>
  
  <script>
    // Função para verificar o token atual
    function checkCurrentToken() {
      const tokenElement = document.getElementById('current-token-info');
      const tokenDataElement = document.getElementById('current-token-data');
      
      // Verificar token no localStorage
      const token = localStorage.getItem('${tokenName}') || localStorage.getItem('token') || localStorage.getItem('abzToken');
      
      if (!token) {
        tokenElement.innerHTML = '<p class="error">Nenhum token encontrado no localStorage.</p>';
        tokenDataElement.textContent = '';
        return;
      }
      
      tokenElement.innerHTML = '<p class="success">Token encontrado no localStorage.</p>';
      
      // Decodificar o token (sem verificar a assinatura)
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Token JWT inválido');
        }
        
        const payload = JSON.parse(atob(parts[1]));
        tokenDataElement.textContent = JSON.stringify(payload, null, 2);
        
        // Verificar se o token está expirado
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          tokenElement.innerHTML += '<p class="error">Token expirado!</p>';
        } else {
          tokenElement.innerHTML += '<p class="success">Token válido.</p>';
        }
        
        // Verificar se o token tem papel de administrador
        if (payload.role === 'ADMIN') {
          tokenElement.innerHTML += '<p class="success">Token tem papel de ADMIN.</p>';
        } else {
          tokenElement.innerHTML += '<p class="error">Token não tem papel de ADMIN.</p>';
        }
      } catch (error) {
        tokenElement.innerHTML += '<p class="error">Erro ao decodificar token: ' + error.message + '</p>';
        tokenDataElement.textContent = '';
      }
    }
    
    // Função para salvar o token de administrador
    function saveAdminToken() {
      const token = document.getElementById('admin-token').textContent;
      
      localStorage.setItem('token', token);
      
      // Remover tokens antigos
      localStorage.removeItem('abzToken');
      
      alert('Token de administrador salvo com sucesso!');
      checkCurrentToken();
    }
    
    // Função para limpar o token
    function clearToken() {
      localStorage.removeItem('token');
      localStorage.removeItem('abzToken');
      localStorage.removeItem('${tokenName}');
      
      alert('Tokens removidos do localStorage.');
      checkCurrentToken();
    }
    
    // Função para verificar um token personalizado
    function verifyCustomToken() {
      const tokenElement = document.getElementById('custom-token');
      const resultElement = document.getElementById('custom-token-result');
      const dataElement = document.getElementById('custom-token-data');
      
      const token = tokenElement.value.trim();
      
      if (!token) {
        alert('Por favor, insira um token para verificar.');
        return;
      }
      
      // Decodificar o token (sem verificar a assinatura)
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Token JWT inválido');
        }
        
        const payload = JSON.parse(atob(parts[1]));
        dataElement.textContent = JSON.stringify(payload, null, 2);
        resultElement.classList.remove('hidden');
      } catch (error) {
        alert('Erro ao decodificar token: ' + error.message);
        resultElement.classList.add('hidden');
      }
    }
    
    // Verificar token atual ao carregar a página
    window.onload = checkCurrentToken;
  </script>
</body>
</html>
`;
    
    // Salvar o HTML em um arquivo
    const htmlFilePath = path.join(process.cwd(), 'token-tester.html');
    fs.writeFileSync(htmlFilePath, htmlContent);
    
    console.log(`HTML para teste de token gerado em: ${htmlFilePath}`);
    console.log('\nVerificação e correção do armazenamento de tokens concluída!');
    console.log('\nInstruções:');
    console.log('1. Abra o arquivo token-tester.html em um navegador');
    console.log('2. Verifique se há algum token atual no localStorage');
    console.log('3. Clique em "Salvar Token de Administrador" para salvar o token gerado');
    console.log('4. Verifique se o token foi salvo corretamente');
    console.log('5. Acesse a aplicação e verifique se a autenticação está funcionando');
  } catch (error) {
    console.error('Erro durante a verificação e correção do armazenamento de tokens:', error);
  }
}

// Executar a função principal
fixTokenStorage();
