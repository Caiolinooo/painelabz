// Script para gerar uma chave de serviço do Supabase
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Função para gerar uma chave de serviço do Supabase
function generateServiceKey() {
  // Obter o URL do Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl) {
    console.error('URL do Supabase não definido. Verifique suas variáveis de ambiente.');
    process.exit(1);
  }

  // Extrair o ID do projeto do URL
  const projectRef = supabaseUrl.split('//')[1].split('.')[0];
  console.log('ID do projeto Supabase:', projectRef);

  // Gerar o payload do JWT
  const payload = {
    iss: 'supabase',
    ref: projectRef,
    role: 'service_role',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 anos
  };

  // Chave secreta para assinar o JWT (pode ser qualquer string)
  const secret = 'supabase-service-key-secret';

  // Gerar o JWT
  const token = jwt.sign(payload, secret);
  console.log('Chave de serviço gerada:', token);
  console.log('Comprimento da chave:', token.length);

  return token;
}

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
console.log('Chave de serviço atual:', currentKey ? `${currentKey.substring(0, 10)}...${currentKey.substring(currentKey.length - 10)}` : 'Não definida');
console.log('Comprimento da chave atual:', currentKey.length);

// Gerar e atualizar a chave de serviço
const newKey = generateServiceKey();
updateServiceKey(newKey);
