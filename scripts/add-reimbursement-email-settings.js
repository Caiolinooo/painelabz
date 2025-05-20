require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase com a chave de serviço
console.log('Criando cliente Supabase com URL:', supabaseUrl);
console.log('Chave de serviço presente:', supabaseServiceKey ? 'Sim' : 'Não');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função principal
async function addReimbursementEmailSettings() {
  try {
    console.log('Iniciando migração para adicionar configurações de email de reembolso...');

    // 1. Verificar se a tabela settings existe
    console.log('Verificando se a tabela settings existe...');
    const { data: settingsTable, error: settingsTableError } = await supabase
      .from('settings')
      .select('id')
      .limit(1);

    if (settingsTableError && settingsTableError.code !== 'PGRST116') {
      console.error('Erro ao verificar tabela settings:', settingsTableError);
      
      // Criar tabela settings
      console.log('Criando tabela settings...');
      const createSettingsTableQuery = `
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value JSONB NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const { error: createTableError } = await supabase.rpc('execute_sql', { query: createSettingsTableQuery });
      
      if (createTableError) {
        console.error('Erro ao criar tabela settings:', createTableError);
        throw new Error('Falha ao criar tabela settings');
      }
      
      console.log('Tabela settings criada com sucesso');
    } else {
      console.log('Tabela settings já existe');
    }

    // 2. Adicionar configuração padrão de email de reembolso
    console.log('Adicionando configuração padrão de email de reembolso...');
    
    // Verificar se a configuração já existe
    const { data: existingConfig, error: configError } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'reimbursement_email_settings')
      .single();
    
    if (configError && configError.code !== 'PGRST116') {
      console.error('Erro ao verificar configuração existente:', configError);
    }
    
    if (!existingConfig) {
      // Inserir configuração padrão
      const { error: insertError } = await supabase
        .from('settings')
        .insert({
          key: 'reimbursement_email_settings',
          value: {
            enableDomainRule: true,
            recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']
          },
          description: 'Configurações de email para solicitações de reembolso'
        });
      
      if (insertError) {
        console.error('Erro ao inserir configuração padrão:', insertError);
        throw new Error('Falha ao inserir configuração padrão');
      }
      
      console.log('Configuração padrão adicionada com sucesso');
    } else {
      console.log('Configuração padrão já existe');
    }

    // 3. Adicionar coluna reimbursement_email_settings à tabela users_unified
    console.log('Adicionando coluna reimbursement_email_settings à tabela users_unified...');
    
    const addColumnQuery = `
      ALTER TABLE users_unified ADD COLUMN IF NOT EXISTS reimbursement_email_settings JSONB;
    `;
    
    const { error: addColumnError } = await supabase.rpc('execute_sql', { query: addColumnQuery });
    
    if (addColumnError) {
      console.error('Erro ao adicionar coluna:', addColumnError);
      throw new Error('Falha ao adicionar coluna reimbursement_email_settings');
    }
    
    console.log('Coluna reimbursement_email_settings adicionada com sucesso');

    // 4. Criar índice para melhorar a performance
    console.log('Criando índice para a coluna reimbursement_email_settings...');
    
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_users_unified_reimbursement_email_settings ON users_unified USING GIN (reimbursement_email_settings);
    `;
    
    const { error: createIndexError } = await supabase.rpc('execute_sql', { query: createIndexQuery });
    
    if (createIndexError) {
      console.error('Erro ao criar índice:', createIndexError);
      throw new Error('Falha ao criar índice');
    }
    
    console.log('Índice criado com sucesso');

    console.log('Migração concluída com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro durante a migração:', error);
    return false;
  }
}

// Executar a função principal
addReimbursementEmailSettings()
  .then(success => {
    if (success) {
      console.log('Script executado com sucesso!');
      process.exit(0);
    } else {
      console.error('Falha ao executar o script.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
