// Script para atualizar a chave de serviço do Supabase
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Chave de serviço correta
const newKey = 'REDACTED_SUPABASE_JWT_ROTATE_ME';

// Função para atualizar a chave de serviço no arquivo .env
function updateServiceKey(newKey) {
  const envPath = path.resolve('.env');

  // Ler o arquivo .env
  let envContent = REDACTED_SUPABASE_JWT_ROTATE_ME 'utf8');

  // Substituir a chave de serviço
  const regex = REDACTED_SUPABASE_JWT_ROTATE_ME;
  envContent = REDACTED_SUPABASE_JWT_ROTATE_ME `REDACTED_SUPABASE_JWT_ROTATE_ME=${newKey}`);

  // Escrever o arquivo atualizado
  fs.writeFileSync(envPath, envContent);

  console.log('Chave de serviço atualizada com sucesso!');
  console.log('Nova chave:', newKey.substring(0, 10) + '...' + newKey.substring(newKey.length - 10));
  console.log('Comprimento da nova chave:', newKey.length);
}

// Verificar a chave de serviço atual
const currentKey = REDACTED_SUPABASE_JWT_ROTATE_ME || '';
console.log('Chave de serviço atual:', currentKey ? `${currentKey.substring(0, 10)}...${currentKey.substring(currentKey.length - 10)}` : 'Não definida');
console.log('Comprimento da chave atual:', currentKey.length);

// Atualizar a chave de serviço
updateServiceKey(newKey);

// Testar a nova chave
console.log('\nTestando a nova chave...');
const supabaseUrl = REDACTED_SUPABASE_JWT_ROTATE_ME;
const supabase = REDACTED_SUPABASE_JWT_ROTATE_ME newKey, {
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
