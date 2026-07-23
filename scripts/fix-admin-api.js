// Script para verificar e corrigir as APIs de administração
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
async function fixAdminAPI() {
  try {
    console.log('Iniciando verificação e correção das APIs de administração...');
    
    // Verificar se o usuário administrador existe
    console.log('\n1. Verificando usuário administrador...');
    
    // Tentar buscar pelo email
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();
    
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
        
        // Gerar token para o administrador
        const token = generateAdminToken(adminByPhone.id, adminByPhone.phone_number);
        
        if (token) {
          console.log('Token gerado com sucesso para o administrador');
          
          // Testar APIs de administração
          await testAdminAPIs(token);
        } else {
          console.error('Erro ao gerar token para o administrador.');
        }
      }
    } else {
      console.log('Usuário administrador encontrado pelo email:', adminUser.id);
      
      // Gerar token para o administrador
      const token = generateAdminToken(adminUser.id, adminUser.phone_number);
      
      if (token) {
        console.log('Token gerado com sucesso para o administrador');
        
        // Testar APIs de administração
        await testAdminAPIs(token);
      } else {
        console.error('Erro ao gerar token para o administrador.');
      }
    }
  } catch (error) {
    console.error('Erro durante a verificação e correção das APIs de administração:', error);
  }
}

// Função para testar as APIs de administração
async function testAdminAPIs(token) {
  console.log('\n2. Testando APIs de administração...');
  
  const endpoints = [
    '/admin/cards/supabase',
    '/users/supabase',
    '/admin/authorized-users',
    '/admin/access-stats',
    '/auth/fix-token'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTestando endpoint: ${endpoint}`);
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log('Endpoint funcionando corretamente');
        
        // Tentar obter os dados
        try {
          const data = await response.json();
          console.log('Dados recebidos:', Array.isArray(data) ? `Array com ${data.length} itens` : 'Objeto');
        } catch (jsonError) {
          console.error('Erro ao processar resposta JSON:', jsonError.message);
        }
      } else {
        console.error('Erro ao acessar endpoint');
        
        try {
          const errorData = await response.json();
          console.error('Detalhes do erro:', errorData);
        } catch (jsonError) {
          console.error('Não foi possível obter detalhes do erro');
        }
      }
    } catch (error) {
      console.error(`Erro ao testar endpoint ${endpoint}:`, error.message);
    }
  }
  
  console.log('\n3. Testando API fix-token...');
  
  try {
    const fixTokenResponse = await fetch(`${apiUrl}/auth/fix-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Status: ${fixTokenResponse.status} ${fixTokenResponse.statusText}`);
    
    if (fixTokenResponse.ok) {
      const fixTokenData = await fixTokenResponse.json();
      console.log('API fix-token funcionando corretamente');
      console.log('Novo token gerado:', fixTokenData.token ? 'Sim' : 'Não');
      
      if (fixTokenData.token) {
        console.log('\nToken para uso:');
        console.log(fixTokenData.token);
      }
    } else {
      console.error('Erro ao acessar API fix-token');
      
      try {
        const errorData = await fixTokenResponse.json();
        console.error('Detalhes do erro:', errorData);
      } catch (jsonError) {
        console.error('Não foi possível obter detalhes do erro');
      }
    }
  } catch (error) {
    console.error('Erro ao testar API fix-token:', error.message);
  }
  
  console.log('\nVerificação e correção das APIs de administração concluída!');
  console.log('\nInstruções:');
  console.log('1. Se algum endpoint falhou, verifique os logs do servidor para mais detalhes');
  console.log('2. Copie o token gerado pela API fix-token');
  console.log('3. No navegador, abra o console do desenvolvedor (F12)');
  console.log('4. Execute: localStorage.setItem("token", "SEU_TOKEN_AQUI")');
  console.log('5. Recarregue a página');
}

// Executar a função principal
fixAdminAPI();
