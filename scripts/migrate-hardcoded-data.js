/**
 * Script para migrar dados hardcoded para o Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Configurações
const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED***;

console.log('🔄 Migração de Dados Hardcoded para Supabase');
console.log('=============================================');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO: SUPABASE_URL e ***REMOVED*** devem estar definidos');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para criptografar valores sensíveis
function encryptValue(value, salt = 'abz-security-salt') {
  if (!value) return '';
  
  const key = crypto.createHash('md5').update(salt).digest('hex').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

async function migrateHardcodedData() {
  try {
    console.log('\n🔍 1. Verificando tabela app_secrets...');
    await ensureAppSecretsTable();

    console.log('\n🔄 2. Migrando credenciais para app_secrets...');
    await migrateCredentials();

    console.log('\n🔄 3. Migrando configurações para settings...');
    await migrateSettings();

    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  }
}

async function ensureAppSecretsTable() {
  // Verificar se a tabela app_secrets existe
  const { data, error } = await supabase
    .from('app_secrets')
    .select('*')
    .limit(1);

  if (error && error.code === 'PGRST116') {
    console.log('❌ Tabela app_secrets não existe');
    console.log('🔧 Criando tabela app_secrets...');
    
    // Criar tabela app_secrets
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS app_secrets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

      -- Create policy for service key access only
      CREATE POLICY "Service key access only" ON app_secrets
        USING (auth.role() = 'service_role');
    `;

    // Executar via API SQL (se disponível) ou instruir criação manual
    console.log('⚠️  Execute o seguinte SQL no Supabase:');
    console.log(createTableSQL);
    
  } else {
    console.log('✅ Tabela app_secrets existe');
  }
}

async function migrateCredentials() {
  const credentials = [
    {
      key: 'ADMIN_EMAIL',
      value: ***REMOVED*** || '***REMOVED***',
      description: 'Email do administrador principal',
      is_encrypted: false
    },
    {
      key: 'ADMIN_PHONE_NUMBER',
      value: ***REMOVED*** || '+5522997847289',
      description: 'Telefone do administrador principal',
      is_encrypted: false
    },
    {
      key: 'ADMIN_PASSWORD',
      value: encryptValue(***REMOVED*** || 'Caio@2122@'),
      description: 'Senha do administrador principal (criptografada)',
      is_encrypted: true
    },
    {
      key: 'ADMIN_FIRST_NAME',
      value: process.env.ADMIN_FIRST_NAME || 'Caio',
      description: 'Nome do administrador principal',
      is_encrypted: false
    },
    {
      key: 'ADMIN_LAST_NAME',
      value: process.env.ADMIN_LAST_NAME || 'Correia',
      description: 'Sobrenome do administrador principal',
      is_encrypted: false
    },
    {
      key: 'JWT_SECRET',
      value: encryptValue(process.env.JWT_SECRET || 'fallback-secret'),
      description: 'Chave secreta para JWT (criptografada)',
      is_encrypted: true
    },
    {
      key: '***REMOVED***',
      value: encryptValue(***REMOVED*** || ''),
      description: 'Chave de serviço do Supabase (criptografada)',
      is_encrypted: true
    }
  ];

  for (const credential of credentials) {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('app_secrets')
        .select('*')
        .eq('key', credential.key)
        .single();

      if (existing) {
        console.log(`⚠️  Credencial ${credential.key} já existe, atualizando...`);
        
        const { error } = await supabase
          .from('app_secrets')
          .update({
            value: credential.value,
            description: credential.description,
            is_encrypted: credential.is_encrypted,
            updated_at: new Date().toISOString()
          })
          .eq('key', credential.key);

        if (error) {
          console.error(`❌ Erro ao atualizar ${credential.key}:`, error);
        } else {
          console.log(`✅ Credencial ${credential.key} atualizada`);
        }
      } else {
        console.log(`➕ Criando credencial ${credential.key}...`);
        
        const { error } = await supabase
          .from('app_secrets')
          .insert(credential);

        if (error) {
          console.error(`❌ Erro ao criar ${credential.key}:`, error);
        } else {
          console.log(`✅ Credencial ${credential.key} criada`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${credential.key}:`, error);
    }
  }
}

async function migrateSettings() {
  const settings = [
    {
      key: 'supabase_url',
      value: ***REMOVED*** || 'https://arzvingdtnttiejcvucs.supabase.co',
      description: 'URL do projeto Supabase'
    },
    {
      key: 'supabase_anon_key',
      value: ***REMOVED*** || '***REMOVED***',
      description: 'Chave anônima do Supabase'
    },
    {
      key: 'app_name',
      value: 'ABZ Group Logistics Dashboard',
      description: 'Nome da aplicação'
    },
    {
      key: 'app_version',
      value: '1.0.0',
      description: 'Versão da aplicação'
    },
    {
      key: 'email_from',
      value: '***REMOVED***',
      description: 'Email remetente padrão'
    },
    {
      key: 'email_host',
      value: 'smtp.gmail.com',
      description: 'Servidor SMTP padrão'
    },
    {
      key: 'email_port',
      value: '465',
      description: 'Porta SMTP padrão'
    }
  ];

  // Verificar se a tabela settings existe
  const { data: settingsTable, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .limit(1);

  if (settingsError && settingsError.code === 'PGRST116') {
    console.log('❌ Tabela settings não existe');
    console.log('⚠️  Execute o script setup-settings-table para criar a tabela settings');
    return;
  }

  for (const setting of settings) {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('settings')
        .select('*')
        .eq('key', setting.key)
        .single();

      if (existing) {
        console.log(`⚠️  Configuração ${setting.key} já existe, pulando...`);
      } else {
        console.log(`➕ Criando configuração ${setting.key}...`);
        
        const { error } = await supabase
          .from('settings')
          .insert(setting);

        if (error) {
          console.error(`❌ Erro ao criar ${setting.key}:`, error);
        } else {
          console.log(`✅ Configuração ${setting.key} criada`);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${setting.key}:`, error);
    }
  }
}

// Executar migração
migrateHardcodedData().then(() => {
  console.log('\n🎉 Migração concluída com sucesso!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Atualizar o código para buscar credenciais do Supabase');
  console.log('2. Remover valores hardcoded do código');
  console.log('3. Configurar variáveis de ambiente no Netlify');
  console.log('4. Testar autenticação em produção');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Migração falhou:', error);
  process.exit(1);
});
