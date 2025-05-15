// Script para corrigir o usuário administrador diretamente no banco de dados
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const adminPassword = process.env.ADMIN_PASSWORD || 'Caio@2122@';
const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Caio';
const adminLastName = process.env.ADMIN_LAST_NAME || 'Correia';

// Verificar configurações
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase
console.log('Criando cliente Supabase com URL:', supabaseUrl);
console.log('Chave de serviço presente:', supabaseServiceKey ? 'Sim' : 'Não');
console.log('Comprimento da chave de serviço:', supabaseServiceKey.length);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para gerar um token JWT para o administrador
function generateAdminToken(userId) {
  try {
    const payload = {
      userId,
      phoneNumber: adminPhone,
      role: 'ADMIN',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dias
    };

    return jwt.sign(payload, jwtSecret);
  } catch (error) {
    console.error('Erro ao gerar token JWT:', error);
    return null;
  }
}

// Função para gerar HTML para teste de token
function generateTokenTester(token, userId) {
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teste de Token de Administrador</title>
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
  <h1>Teste de Token de Administrador</h1>
  
  <div class="card">
    <h2>Informações do Administrador</h2>
    <p><strong>ID:</strong> ${userId}</p>
    <p><strong>Nome:</strong> ${adminFirstName} ${adminLastName}</p>
    <p><strong>Email:</strong> ${adminEmail}</p>
    <p><strong>Telefone:</strong> ${adminPhone}</p>
    <p><strong>Papel:</strong> ADMIN</p>
  </div>
  
  <div class="card">
    <h2>Token de Administrador</h2>
    <p>Use este token para autenticar como administrador:</p>
    <pre id="admin-token">${token}</pre>
    <button onclick="saveAdminToken()">Salvar Token de Administrador</button>
  </div>
  
  <div class="card">
    <h2>Token Atual</h2>
    <div id="current-token-info"></div>
    <pre id="current-token-data"></pre>
    <button onclick="checkCurrentToken()">Verificar Token Atual</button>
    <button onclick="clearToken()">Limpar Token</button>
  </div>
  
  <div class="card">
    <h2>Próximos Passos</h2>
    <ol>
      <li>Clique em "Salvar Token de Administrador" para salvar o token no localStorage</li>
      <li>Clique em "Verificar Token Atual" para confirmar que o token foi salvo corretamente</li>
      <li>Acesse a aplicação e verifique se a autenticação está funcionando</li>
      <li>Se ainda houver problemas, acesse a página <a href="/admin-fix" target="_blank">/admin-fix</a> para corrigir automaticamente</li>
    </ol>
  </div>
  
  <script>
    // Função para verificar o token atual
    function checkCurrentToken() {
      const tokenElement = document.getElementById('current-token-info');
      const tokenDataElement = document.getElementById('current-token-data');
      
      // Verificar token no localStorage
      const token = localStorage.getItem('token') || localStorage.getItem('abzToken');
      
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
      
      alert('Tokens removidos do localStorage.');
      checkCurrentToken();
    }
    
    // Verificar token atual ao carregar a página
    window.onload = checkCurrentToken;
  </script>
</body>
</html>
`;
  
  // Salvar o HTML em um arquivo
  fs.writeFileSync('admin-token-tester.html', htmlContent);
  
  console.log('\nHTML para teste de token gerado em: admin-token-tester.html');
  console.log('Abra este arquivo em um navegador para testar o token de administrador.');
}

// Função principal
async function fixAdminDirect() {
  try {
    console.log('Corrigindo usuário administrador diretamente no banco de dados...');
    
    // Verificar se o usuário administrador existe
    console.log('\n1. Verificando usuário administrador...');
    console.log('Email do administrador:', adminEmail);
    console.log('Telefone do administrador:', adminPhone);
    
    // Tentar buscar pelo email
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
    let userId;
    
    if (adminError) {
      console.log('Usuário administrador não encontrado pelo email, tentando pelo telefone...');
      
      // Tentar buscar pelo telefone
      const { data: adminByPhone, error: phoneError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', adminPhone)
        .single();
      
      if (phoneError) {
        console.log('Usuário administrador não encontrado pelo telefone, criando novo usuário...');
        
        // Criar novo usuário
        userId = uuidv4();
        console.log('Novo ID gerado para o administrador:', userId);
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: adminEmail,
            phone_number: adminPhone,
            first_name: adminFirstName,
            last_name: adminLastName,
            role: 'ADMIN',
            position: 'Administrador do Sistema',
            department: 'TI',
            active: true,
            access_permissions: { 
              modules: { 
                admin: true,
                dashboard: true,
                manual: true,
                procedimentos: true,
                politicas: true,
                calendario: true,
                noticias: true,
                reembolso: true,
                contracheque: true,
                ponto: true,
                avaliacao: true
              } 
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Erro ao criar usuário administrador:', createError);
          process.exit(1);
        }
        
        console.log('Usuário administrador criado com sucesso:', newUser.id);
      } else {
        console.log('Usuário administrador encontrado pelo telefone:', adminByPhone.id);
        userId = adminByPhone.id;
        
        // Atualizar o usuário para ter papel de administrador
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'ADMIN',
            access_permissions: { 
              modules: { 
                admin: true,
                dashboard: true,
                manual: true,
                procedimentos: true,
                politicas: true,
                calendario: true,
                noticias: true,
                reembolso: true,
                contracheque: true,
                ponto: true,
                avaliacao: true
              } 
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Erro ao atualizar usuário administrador:', updateError);
        } else {
          console.log('Usuário administrador atualizado com sucesso');
        }
      }
    } else {
      console.log('Usuário administrador encontrado pelo email:', adminUser.id);
      userId = adminUser.id;
      
      // Atualizar o usuário para ter papel de administrador
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: 'ADMIN',
          access_permissions: { 
            modules: { 
              admin: true,
              dashboard: true,
              manual: true,
              procedimentos: true,
              politicas: true,
              calendario: true,
              noticias: true,
              reembolso: true,
              contracheque: true,
              ponto: true,
              avaliacao: true
            } 
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Erro ao atualizar usuário administrador:', updateError);
      } else {
        console.log('Usuário administrador atualizado com sucesso');
      }
    }
    
    // Gerar token para o administrador
    console.log('\n2. Gerando token para o administrador...');
    const token = generateAdminToken(userId);
    
    if (!token) {
      console.error('Erro ao gerar token para o administrador');
      process.exit(1);
    }
    
    console.log('Token gerado com sucesso para o administrador:');
    console.log(token);
    
    // Gerar HTML para teste de token
    generateTokenTester(token, userId);
    
    console.log('\nCorrigido com sucesso!');
    console.log('ID do administrador:', userId);
    console.log('Token do administrador gerado e salvo em admin-token-tester.html');
  } catch (error) {
    console.error('Erro ao corrigir usuário administrador:', error);
  }
}

// Executar a função principal
fixAdminDirect();
