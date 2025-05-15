// Script para testar as APIs de administração com o token gerado
require('dotenv').config();
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// Configurações
const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
const adminId = '00000000-0000-0000-0000-000000000000'; // ID fixo para o administrador
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Gerar token JWT
function generateAdminToken() {
  try {
    const payload = {
      userId: adminId,
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

// Função principal
async function testAdminAPI() {
  console.log('Testando APIs de administração...');
  
  // Gerar token de administrador
  const token = generateAdminToken();
  if (!token) {
    console.error('Erro ao gerar token de administrador');
    process.exit(1);
  }
  
  console.log('Token de administrador gerado com sucesso');
  console.log('Token:', token);
  
  // Endpoints a serem testados
  const endpoints = [
    { method: 'GET', url: '/admin/cards/supabase' },
    { method: 'GET', url: '/users/supabase' },
    { method: 'GET', url: '/admin/authorized-users' },
    { method: 'GET', url: '/admin/access-stats' },
    { method: 'POST', url: '/auth/fix-token' },
    { method: 'POST', url: '/auth/token-refresh' }
  ];
  
  // Testar cada endpoint
  for (const endpoint of endpoints) {
    console.log(`\nTestando endpoint: ${endpoint.method} ${endpoint.url}`);
    
    try {
      const response = await fetch(`${apiUrl}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Resposta:', JSON.stringify(data, null, 2).substring(0, 500) + (JSON.stringify(data, null, 2).length > 500 ? '...' : ''));
        } else {
          const text = await response.text();
          console.log('Resposta (texto):', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
        }
      } else {
        try {
          const errorData = await response.json();
          console.error('Erro:', errorData);
        } catch (jsonError) {
          const text = await response.text();
          console.error('Erro (texto):', text);
        }
      }
    } catch (error) {
      console.error('Erro ao testar endpoint:', error);
    }
  }
  
  console.log('\nTestes concluídos!');
}

// Executar a função principal
testAdminAPI();
