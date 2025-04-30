// Script para executar SQL no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Obter argumentos da linha de comando
const args = process.argv.slice(2);
const sqlFilePath = args[0];

if (!sqlFilePath) {
  console.error('Uso: node run-supabase-sql.js <caminho-do-arquivo-sql>');
  process.exit(1);
}

// Criar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Ler o arquivo SQL
const sqlContent = fs.readFileSync(path.resolve(sqlFilePath), 'utf8');

// Executar o SQL
async function runSQL() {
  try {
    console.log(`Executando SQL do arquivo: ${sqlFilePath}`);

    // Dividir o SQL em comandos separados
    const commands = sqlContent.split(';').filter(cmd => cmd.trim().length > 0);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i].trim() + ';';
      console.log(`Executando comando ${i + 1}/${commands.length}:`);
      console.log(command.substring(0, 100) + (command.length > 100 ? '...' : ''));

      const { error } = await supabase.rpc('exec_sql', { query: command });

      if (error) {
        console.error(`Erro ao executar comando ${i + 1}:`, error);
      } else {
        console.log(`Comando ${i + 1} executado com sucesso.`);
      }
    }

    console.log('SQL executado com sucesso!');
  } catch (error) {
    console.error('Erro ao executar SQL:', error);
  }
}

runSQL();
