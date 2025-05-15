// Script para criar a função exec_sql no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações
const SUPABASE_URL = ***REMOVED***;
const ***REMOVED*** = ***REMOVED***;

// Verificar se as variáveis de ambiente estão configuradas
if (!SUPABASE_URL || !***REMOVED***) {
  console.error('SUPABASE_URL ou ***REMOVED*** não estão definidos. Configure as variáveis de ambiente.');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, ***REMOVED***);

// Função para executar o SQL
async function createExecSqlFunction() {
  try {
    console.log('Criando função exec_sql no Supabase...');
    
    // Ler o arquivo SQL
    const sqlFilePath = path.resolve(__dirname, 'create-exec-sql-function.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Executar o SQL diretamente usando a API REST do Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${***REMOVED***}`,
        'apikey': ***REMOVED***,
        'Prefer': 'params=single-object'
      },
      body: ***REMOVED***
        query: sqlContent
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao criar função exec_sql:', errorData);
      process.exit(1);
    }
    
    console.log('Função exec_sql criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar função exec_sql:', error);
    process.exit(1);
  }
}

// Executar o script
createExecSqlFunction()
  .then(() => {
    console.log('Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro durante a execução do script:', error);
    process.exit(1);
  });
