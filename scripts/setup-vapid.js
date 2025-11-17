#!/usr/bin/env node

/**
 * Script para configurar Push Notifications automaticamente
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

async function setupVapid() {
  console.log('🚀 Configurando Push Notifications...\n');

  try {
    // Ler e executar o script SQL
    const sqlPath = path.join(__dirname, 'setup-vapid-keys.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir em comandos individuais (simplificado)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));

    console.log('📝 Executando configuração SQL...');
    
    // Executar comandos SQL via RPC (método mais compatível)
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: `
        -- Criar tabela se não existir
        CREATE TABLE IF NOT EXISTS app_secrets (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            is_encrypted BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Inserir chaves VAPID
        INSERT INTO app_secrets (key, value, description, is_encrypted) VALUES
        ('VAPID_PUBLIC_KEY', 'BCPzcJmoggpOBd_UPIYMhK2u482VOlEldXdr-ShQHA9fTQvtm4yPT9TU-DdTcmujBL-8BwWHTpxS2BQihUgZzdo', 'Chave pública VAPID para push notifications', FALSE),
        ('VAPID_PRIVATE_KEY', 'OCPM8yhePNB838yd_vYdD0h8KILhM0P7489OWXSlqfY', 'Chave privada VAPID para push notifications', FALSE),
        ('VAPID_SUBJECT', 'mailto:***REMOVED***', 'Subject VAPID para push notifications', FALSE)
        ON CONFLICT (key) DO UPDATE SET 
            value = EXCLUDED.value,
            description = ***REMOVED***
            updated_at = NOW();
      `
    });

    if (error) {
      // Tentar método alternativo - inserção direta
      console.log('⚠️ Tentando método alternativo...');
      
      const vapidKeys = [
        {
          key: 'VAPID_PUBLIC_KEY',
          value: 'BCPzcJmoggpOBd_UPIYMhK2u482VOlEldXdr-ShQHA9fTQvtm4yPT9TU-DdTcmujBL-8BwWHTpxS2BQihUgZzdo',
          description: 'Chave pública VAPID para push notifications',
          is_encrypted: false
        },
        {
          key: 'VAPID_PRIVATE_KEY',
          value: 'OCPM8yhePNB838yd_vYdD0h8KILhM0P7489OWXSlqfY',
          description: 'Chave privada VAPID para push notifications',
          is_encrypted: false
        },
        {
          key: 'VAPID_SUBJECT',
          value: 'mailto:***REMOVED***',
          description: 'Subject VAPID para push notifications',
          is_encrypted: false
        }
      ];

      for (const key of vapidKeys) {
        const { error: upsertError } = await supabase
          .from('app_secrets')
          .upsert(key, { onConflict: 'key' });
        
        if (upsertError) {
          console.error(`❌ Erro ao inserir ${key.key}:`, upsertError.message);
        } else {
          console.log(`✅ ${key.key} configurada`);
        }
      }
    } else {
      console.log('✅ Configuração SQL executada com sucesso');
    }

    // Verificar resultado
    const { data: vapidKeys, error: checkError } = await supabase
      .from('app_secrets')
      .select('key, description')
      .like('key', 'VAPID_%');

    if (checkError) {
      console.error('❌ Erro ao verificar configuração:', checkError.message);
      return;
    }

    console.log('\n📋 Chaves VAPID configuradas:');
    vapidKeys.forEach(key => {
      console.log(`✅ ${key.key}: ${key.description}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Push Notifications CONFIGURADO COM SUCESSO!');
    console.log('✅ Sistema pronto para enviar notificações push');
    console.log('💡 Execute "npm run test:push" para validar');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error.message);
    console.log('\n💡 Tente executar manualmente o arquivo: scripts/setup-vapid-keys.sql');
  }
}

setupVapid();