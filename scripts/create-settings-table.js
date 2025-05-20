/**
 * Script para criar a tabela settings no Supabase e adicionar configurações padrão de reembolso
 */

const { supabaseAdmin } = require('../src/lib/supabase');

async function createSettingsTable() {
  try {
    console.log('Iniciando criação da tabela settings...');

    // Verificar se a função execute_sql existe
    const { data: functionExists, error: functionError } = await supabaseAdmin.rpc(
      'execute_sql',
      { query: "SELECT 1 FROM pg_proc WHERE proname = 'execute_sql'" }
    ).single();

    if (functionError && functionError.message !== 'JSON object requested, multiple (or no) rows returned') {
      console.log('Criando função execute_sql...');
      
      // Criar função execute_sql se não existir
      const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION execute_sql(query text)
        RETURNS VOID AS $$
        BEGIN
          EXECUTE query;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      // Executar diretamente via SQL
      const { error: createFunctionError } = await supabaseAdmin.from('_temp_execute_sql').select('*').limit(1);
      if (createFunctionError) {
        console.error('Erro ao criar função execute_sql:', createFunctionError);
        console.log('Tentando método alternativo...');
      }
    }

    // Criar tabela settings
    console.log('Criando tabela settings...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    try {
      const { error: createTableError } = await supabaseAdmin.rpc('execute_sql', { query: createTableQuery });
      
      if (createTableError) {
        console.error('Erro ao criar tabela settings via RPC:', createTableError);
        throw new Error('Falha ao criar tabela settings');
      }
      
      console.log('Tabela settings criada com sucesso');
    } catch (rpcError) {
      console.error('Erro ao executar RPC:', rpcError);
      
      // Método alternativo: inserir diretamente e capturar erro
      console.log('Tentando método alternativo para criar tabela...');
      
      try {
        // Tentar inserir um registro para ver se a tabela existe
        const { error: insertError } = await supabaseAdmin
          .from('settings')
          .insert({
            key: 'test_key',
            value: { test: true },
            description: 'Test record'
          });
        
        if (insertError && insertError.code === '42P01') {
          console.error('Tabela settings não existe. Por favor, crie manualmente no Supabase Studio.');
          console.log('SQL para criar a tabela:');
          console.log(createTableQuery);
          return false;
        } else if (!insertError) {
          // Limpar registro de teste
          await supabaseAdmin
            .from('settings')
            .delete()
            .eq('key', 'test_key');
          
          console.log('Tabela settings já existe');
        }
      } catch (insertError) {
        console.error('Erro ao verificar tabela:', insertError);
        return false;
      }
    }

    // Adicionar configuração padrão de email de reembolso
    console.log('Adicionando configuração padrão de email de reembolso...');
    
    // Verificar se a configuração já existe
    const { data: existingConfig, error: configError } = await supabaseAdmin
      .from('settings')
      .select('id')
      .eq('key', 'reimbursement_email_settings')
      .single();
    
    if (configError && configError.code !== 'PGRST116') {
      console.error('Erro ao verificar configuração existente:', configError);
    }
    
    if (!existingConfig) {
      // Inserir configuração padrão
      const { error: insertError } = await supabaseAdmin
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
        return false;
      }
      
      console.log('Configuração padrão adicionada com sucesso');
    } else {
      console.log('Configuração padrão já existe');
    }

    return true;
  } catch (error) {
    console.error('Erro ao criar tabela settings:', error);
    return false;
  }
}

// Executar a função principal
createSettingsTable()
  .then(success => {
    if (success) {
      console.log('Tabela settings criada e configurada com sucesso!');
    } else {
      console.error('Falha ao criar ou configurar tabela settings.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
