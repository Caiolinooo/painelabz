// Script para verificar e corrigir a chave de serviço do Supabase
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Criar interface de leitura
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
}

// Verificar a chave de serviço atual
const currentKey = process.env.SUPABASE_SERVICE_KEY || '';
console.log('Chave de serviço atual:', currentKey ? `${currentKey.substring(0, 10)}...` : 'Não definida');
console.log('Comprimento da chave atual:', currentKey.length);

// Solicitar a nova chave de serviço
console.log('\nPara obter a chave de serviço correta:');
console.log('1. Acesse o painel do Supabase (https://app.supabase.com)');
console.log('2. Selecione seu projeto');
console.log('3. Vá para "Settings" > "API"');
console.log('4. Copie a "service_role key" (NÃO a anon key)');
console.log('\nA chave deve começar com "ey" e ser um JWT completo, não apenas um prefixo como "sbp_"');

rl.question('\nDigite a nova chave de serviço do Supabase: ', (newKey) => {
  if (!newKey || newKey.length < 100 || !newKey.startsWith('ey')) {
    console.error('Chave inválida! A chave deve ser um JWT completo e ter pelo menos 100 caracteres.');
    rl.close();
    return;
  }

  // Atualizar a chave de serviço
  updateServiceKey(newKey);

  rl.close();
});
