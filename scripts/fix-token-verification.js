// Script para verificar e corrigir a verificação de tokens
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';

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

// Função para verificar um token JWT
function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    console.error('Erro ao verificar token:', error.message);
    return null;
  }
}

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
async function fixTokenVerification() {
  try {
    console.log('Iniciando verificação e correção da verificação de tokens...');
    
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
          console.log('\nToken gerado com sucesso para o administrador:');
          console.log(token);
          
          // Verificar o token gerado
          const decoded = verifyToken(token);
          
          if (decoded) {
            console.log('\nToken verificado com sucesso:');
            console.log(JSON.stringify(decoded, null, 2));
          } else {
            console.error('\nErro ao verificar o token gerado.');
          }
        } else {
          console.error('\nErro ao gerar token para o administrador.');
        }
      }
    } else {
      console.log('Usuário administrador encontrado pelo email:', adminUser.id);
      
      // Gerar token para o administrador
      const token = generateAdminToken(adminUser.id, adminUser.phone_number);
      
      if (token) {
        console.log('\nToken gerado com sucesso para o administrador:');
        console.log(token);
        
        // Verificar o token gerado
        const decoded = verifyToken(token);
        
        if (decoded) {
          console.log('\nToken verificado com sucesso:');
          console.log(JSON.stringify(decoded, null, 2));
        } else {
          console.error('\nErro ao verificar o token gerado.');
        }
      } else {
        console.error('\nErro ao gerar token para o administrador.');
      }
    }
    
    console.log('\n2. Verificando configuração do JWT_SECRET...');
    console.log('JWT_SECRET presente:', jwtSecret ? 'Sim' : 'Não');
    console.log('Comprimento do JWT_SECRET:', jwtSecret ? jwtSecret.length : 0);
    
    if (jwtSecret && jwtSecret.length >= 32) {
      console.log('JWT_SECRET parece válido.');
    } else {
      console.error('JWT_SECRET parece inválido ou muito curto. Deve ter pelo menos 32 caracteres.');
    }
    
    console.log('\nVerificação e correção da verificação de tokens concluída!');
    console.log('\nInstruções:');
    console.log('1. Copie o token gerado acima');
    console.log('2. No navegador, abra o console do desenvolvedor (F12)');
    console.log('3. Execute: localStorage.setItem("token", "SEU_TOKEN_AQUI")');
    console.log('4. Recarregue a página');
  } catch (error) {
    console.error('Erro durante a verificação e correção da verificação de tokens:', error);
  }
}

// Executar a função principal
fixTokenVerification();
