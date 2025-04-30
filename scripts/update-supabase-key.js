// Script para atualizar a chave de serviço do Supabase
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Chave de serviço correta
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNDk0NjcyOSwiZXhwIjoyMDIwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk';

// Função para atualizar a chave de serviço no arquivo .env
function updateServiceKey(newKey) {
  const envPath = path.resolve('.env');

  // Ler o arquivo .env
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Substituir a chave de serviço
  const regex = /SUPABASE_SERVICE_KEY=.*/;
  envContent = envContent.replace(regex, `SUPABASE_SERVICE_KEY=${newKey}`);

  // Escrever o arquivo atualizado
  fs.writeFileSync(envPath, envContent);

  console.log('Chave de serviço atualizada com sucesso!');
  console.log('Nova chave:', newKey.substring(0, 10) + '...' + newKey.substring(newKey.length - 10));
  console.log('Comprimento da nova chave:', newKey.length);
}

// Verificar a chave de serviço atual
const currentKey = process.env.SUPABASE_SERVICE_KEY || '';
console.log('Chave de serviço atual:', currentKey ? `${currentKey.substring(0, 10)}...${currentKey.substring(currentKey.length - 10)}` : 'Não definida');
console.log('Comprimento da chave atual:', currentKey.length);

// Atualizar a chave de serviço
updateServiceKey(newKey);

// Testar a nova chave
console.log('\nTestando a nova chave...');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabase = createClient(supabaseUrl, newKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

supabase.from('users').select('count').limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('Erro ao testar a nova chave:', error);
    } else {
      console.log('Teste bem-sucedido! A nova chave está funcionando corretamente.');
      console.log('Dados recebidos:', data);
    }
  })
  .catch((error) => {
    console.error('Erro ao testar a nova chave:', error);
  });
