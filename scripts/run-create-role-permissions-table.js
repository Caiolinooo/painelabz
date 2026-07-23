const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseUrl = REDACTED_SUPABASE_JWT_ROTATE_ME || 'https://arzvingdtnttiejcvucs.supabase.co';
const supabaseKey = REDACTED_SUPABASE_JWT_ROTATE_ME || 'REDACTED_SUPABASE_JWT_ROTATE_ME';

const supabase = REDACTED_SUPABASE_JWT_ROTATE_ME supabaseKey);

async function createRolePermissionsTable() {
  try {
    console.log('Criando tabela de permissões por role...');

    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'create-role-permissions-table.sql');
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
          if (data) {
            console.log('Resultado:', data);
          }
        }
      }
    }

    console.log('✅ Tabela de permissões por role criada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela de permissões por role:', error);
  }
}

createRolePermissionsTable();
