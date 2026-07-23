/**
 * Script para configurar os buckets de armazenamento no Supabase
 * Este script chama a API de configuração de buckets
 */

const fetch = require('node-fetch');
require('dotenv').config();

async function setupStorage() {
  try {
    console.log('Configurando buckets de armazenamento...');
    
    // Obter o token de serviço do Supabase
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY não encontrada no arquivo .env');
      process.exit(1);
    }
    
    // URL da API
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/setup-storage-buckets`;
    
    // Chamar a API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro ao configurar buckets:', data.error);
      process.exit(1);
    }
    
    console.log('Resultado da configuração:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('Configuração de buckets concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao executar script:', error);
    process.exit(1);
  }
}

setupStorage();
