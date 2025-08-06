const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseUrl = ***REMOVED*** || 'https://arzvingdtnttiejcvucs.supabase.co';
const supabaseKey = ***REMOVED*** || '***REMOVED***';

const supabase = ***REMOVED*** supabaseKey);

async function addEmailVerificationColumns() {
  try {
    console.log('Adicionando colunas de verificação de email...');

    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'add-email-verification-columns.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');

    // Dividir em comandos individuais
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    // Executar cada comando
    for (const command of commands) {
      if (command.trim()) {
        console.log('Executando:', command.substring(0, 50) + '...');
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command
        });

        if (error) {
          console.error('Erro ao executar comando:', error);
          console.error('Comando:', command);
        } else {
          console.log('✓ Comando executado com sucesso');
        }
      }
    }

    console.log('✅ Colunas de verificação de email adicionadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error);
  }
}

addEmailVerificationColumns();
