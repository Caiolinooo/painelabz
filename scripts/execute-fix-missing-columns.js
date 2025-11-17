/**
 * Script para executar correções de colunas faltantes no banco de dados
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeFixMissingColumns() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente não configuradas');
    }

    const supabase = ***REMOVED*** supabaseServiceKey);

    console.log('🔧 Executando correções de colunas faltantes...');

    // Ler o script SQL
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'fix-missing-columns.sql'),
      'utf8'
    );

    // Separar comandos SQL pelo delimitador $$
    const commands = sqlScript.split('$$').filter(cmd => cmd.trim());

    console.log(`📋 Encontrados ${commands.length} comandos SQL para executar`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim();

      if (command.startsWith('DO')) {
        console.log(`\n${i + 1}. Executando comando DO...`);

        try {
          // Tentar executar via RPC se a função existir
          const { error } = await supabase.rpc('exec_sql', { query: command });

          if (error) {
            console.warn('⚠️  RPC não disponível, tentando método direto...');

            // Método alternativo: executar via SQL direto
            const response = await fetch(`${supabaseUrl}/rest/v1/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
                'Prefer': 'return=minimal'
              },
              body: ***REMOVED*** query: command })
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.text();
            if (result && result.includes('NOTICE')) {
              console.log('✅ Comando executado com avisos:');
              result.split('\n').forEach(line => {
                if (line.includes('NOTICE')) {
                  console.log(`   ${line.trim()}`);
                }
              });
            }
          } else {
            console.log('✅ Comando executado via RPC com sucesso');
          }

          successCount++;
        } catch (error) {
          console.error(`❌ Erro ao executar comando ${i + 1}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n🎉 Resumo da execução:');
    console.log(`   ✅ Comandos executados com sucesso: ${successCount}`);
    console.log(`   ❌ Erros encontrados: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🚀 Todas as correções foram aplicadas com sucesso!');
      console.log('   O sistema de avaliações deve funcionar corretamente agora.');
    } else {
      console.log('\n⚠️  Alguns comandos falharam. Verifique os logs acima.');
    }

    // Verificação final
    console.log('\n🔍 Realizando verificação final...');

    try {
      // Verificar users_unified
      const { data: usersData, error: usersError } = await supabase
        .from('users_unified')
        .select('id, deleted_at')
        .limit(1);

      if (usersError) {
        console.log('❌ Erro ao verificar users_unified:', usersError.message);
      } else {
        if (usersData && usersData.length > 0) {
          const hasDeletedAt = usersData[0].hasOwnProperty('deleted_at');
          console.log(`✅ Tabela users_unified - Coluna deleted_at: ${hasDeletedAt ? 'Presente' : 'Ausente'}`);
        }
      }

      // Verificar notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('id, email_sent, push_sent')
        .limit(1);

      if (notificationsError) {
        console.log('ℹ️  Tabela notifications:', notificationsError.message);
      } else {
        if (notificationsData && notificationsData.length > 0) {
          const hasEmailSent = notificationsData[0].hasOwnProperty('email_sent');
          const hasPushSent = notificationsData[0].hasOwnProperty('push_sent');
          console.log(`✅ Tabela notifications - Colunas: email_sent=${hasEmailSent ? 'Presente' : 'Ausente'}, push_sent=${hasPushSent ? 'Presente' : 'Ausente'}`);
        } else {
          console.log('ℹ️  Tabela notifications está vazia');
        }
      }

    } catch (error) {
      console.log('❌ Erro na verificação final:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral na execução:', error.message);
    process.exit(1);
  }
}

executeFixMissingColumns();