// Script para migrar credenciais para a tabela app_secrets
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

// Verificar configurações
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase
console.log('Criando cliente Supabase com URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para criptografar um valor
function encryptValue(value, salt = 'abz-security-salt') {
  if (!value) return '';
  
  // Criar um hash MD5 do salt para usar como chave
  const key = crypto.createHash('md5').update(salt).digest('hex').slice(0, 32);
  
  // Criar um IV aleatório
  const iv = crypto.randomBytes(16);
  
  // Criar cipher usando AES-256-CBC
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  // Criptografar o valor
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Retornar IV + valor criptografado
  return iv.toString('hex') + ':' + encrypted;
}

// Função para descriptografar um valor
function decryptValue(encryptedValue, salt = 'abz-security-salt') {
  if (!encryptedValue) return '';
  
  // Separar IV e valor criptografado
  const parts = encryptedValue.split(':');
  if (parts.length !== 2) return '';
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  // Criar um hash MD5 do salt para usar como chave
  const key = crypto.createHash('md5').update(salt).digest('hex').slice(0, 32);
  
  // Criar decipher
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  // Descriptografar o valor
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Função para salvar um segredo na tabela app_secrets
async function saveSecret(key, value, description, isEncrypted = false) {
  console.log(`Salvando segredo: ${key}`);
  
  // Criptografar o valor se necessário
  const finalValue = isEncrypted ? encryptValue(value) : value;
  
  // Inserir ou atualizar o segredo
  const { error } = await supabase
    .from('app_secrets')
    .upsert({
      key,
      value: finalValue,
      description,
      is_encrypted: isEncrypted,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'key'
    });
  
  if (error) {
    console.error(`Erro ao salvar segredo ${key}:`, error);
    return false;
  }
  
  console.log(`Segredo ${key} salvo com sucesso`);
  return true;
}

// Função para verificar se um segredo existe
async function secretExists(key) {
  const { data, error } = await supabase
    .from('app_secrets')
    .select('id')
    .eq('key', key)
    .single();
  
  if (error && !error.message.includes('No rows found')) {
    console.error(`Erro ao verificar segredo ${key}:`, error);
  }
  
  return !!data;
}

// Função principal
async function main() {
  console.log('Iniciando migração de credenciais...');
  
  // Lista de credenciais para migrar
  const credentials = [
    {
      key: 'JWT_SECRET',
      value: jwtSecret || 'fallback-secret',
      description: 'Chave secreta para assinatura de tokens JWT',
      isEncrypted: true
    },
    {
      key: 'EMAIL_USER',
      value: emailUser || 'apiabzgroup@gmail.com',
      description: 'Usuário de email para envio de notificações',
      isEncrypted: false
    },
    {
      key: 'EMAIL_PASSWORD',
      value: emailPassword || 'zbli vdst fmco dtfc',
      description: 'Senha do email para envio de notificações',
      isEncrypted: true
    },
    {
      key: 'SUPABASE_SERVICE_KEY',
      value: supabaseServiceKey,
      description: 'Chave de serviço do Supabase',
      isEncrypted: true
    }
  ];
  
  // Migrar cada credencial
  for (const cred of credentials) {
    // Verificar se o segredo já existe
    const exists = await secretExists(cred.key);
    
    if (exists) {
      console.log(`Segredo ${cred.key} já existe, pulando...`);
      continue;
    }
    
    // Salvar o segredo
    const success = await saveSecret(cred.key, cred.value, cred.description, cred.isEncrypted);
    
    if (!success) {
      console.error(`Falha ao migrar credencial ${cred.key}`);
    }
  }
  
  console.log('Migração de credenciais concluída!');
  
  // Criar arquivo de configuração para o cliente
  const configContent = `// Arquivo gerado automaticamente - NÃO EDITAR MANUALMENTE
export const SECURITY_SALT = 'abz-security-salt';
export const SUPABASE_KEY_HASH = '${crypto.createHash('md5').update(supabaseServiceKey).digest('hex')}';
`;
  
  // Salvar arquivo de configuração
  const configPath = path.join(__dirname, '..', 'src', 'lib', 'security-config.ts');
  fs.writeFileSync(configPath, configContent);
  
  console.log(`Arquivo de configuração salvo em ${configPath}`);
}

// Executar função principal
main()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
