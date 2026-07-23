// Script para verificar e corrigir a API de listagem de usuários
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
async function fixUsersAPI() {
  try {
    console.log('Iniciando verificação e correção da API de listagem de usuários...');
    
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
    
    // Testar API de listagem de usuários
    console.log('\n2. Testando API de listagem de usuários...');
    
    // Testar endpoint /users/supabase
    console.log('\nTestando endpoint: /users/supabase');
    
    try {
      const response = await fetch(`${apiUrl}/users/supabase`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API de listagem de usuários funcionando corretamente');
        console.log(`Número de usuários retornados: ${data.length}`);
        
        if (data.length > 0) {
          console.log('\nExemplo de usuário retornado:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      } else {
        console.error('Erro ao acessar API de listagem de usuários');
        
        try {
          const errorData = await response.json();
          console.error('Detalhes do erro:', errorData);
        } catch (jsonError) {
          console.error('Não foi possível obter detalhes do erro');
        }
      }
    } catch (error) {
      console.error('Erro ao testar API de listagem de usuários:', error.message);
    }
    
    // Testar endpoint /users
    console.log('\nTestando endpoint: /users');
    
    try {
      const response = await fetch(`${apiUrl}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API de listagem de usuários (Prisma) funcionando corretamente');
        console.log(`Número de usuários retornados: ${data.length}`);
        
        if (data.length > 0) {
          console.log('\nExemplo de usuário retornado:');
          console.log(JSON.stringify(data[0], null, 2));
        }
      } else {
        console.error('Erro ao acessar API de listagem de usuários (Prisma)');
        
        try {
          const errorData = await response.json();
          console.error('Detalhes do erro:', errorData);
        } catch (jsonError) {
          console.error('Não foi possível obter detalhes do erro');
        }
      }
    } catch (error) {
      console.error('Erro ao testar API de listagem de usuários (Prisma):', error.message);
    }
    
    // Testar API de estatísticas
    console.log('\n3. Testando API de estatísticas...');
    
    try {
      const response = await fetch(`${apiUrl}/admin/access-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API de estatísticas funcionando corretamente');
        console.log('Dados retornados:', data);
      } else {
        console.error('Erro ao acessar API de estatísticas');
        
        try {
          const errorData = await response.json();
          console.error('Detalhes do erro:', errorData);
        } catch (jsonError) {
          console.error('Não foi possível obter detalhes do erro');
        }
      }
    } catch (error) {
      console.error('Erro ao testar API de estatísticas:', error.message);
    }
    
    console.log('\nVerificação e correção da API de listagem de usuários concluída!');
    console.log('\nToken para uso:');
    console.log(token);
    console.log('\nInstruções:');
    console.log('1. Copie o token acima');
    console.log('2. No navegador, abra o console do desenvolvedor (F12)');
    console.log('3. Execute: localStorage.setItem("token", "SEU_TOKEN_AQUI")');
    console.log('4. Recarregue a página');
  } catch (error) {
    console.error('Erro durante a verificação e correção da API de listagem de usuários:', error);
  }
}

// Executar a função principal
fixUsersAPI();
