// Script para executar os scripts SQL de configuração de segurança
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Obter variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const dbConnectionString = process.env.DATABASE_URL;

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

// Função para executar um arquivo SQL usando o cliente Postgres
async function executeSqlFile(filePath) {
  console.log(`Executando arquivo SQL: ${filePath}`);
  
  // Verificar se o arquivo existe
  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo ${filePath} não encontrado`);
    return false;
  }
  
  // Ler o conteúdo do arquivo
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  
  // Verificar se temos uma conexão direta com o banco de dados
  if (dbConnectionString) {
    console.log('Usando conexão direta com o banco de dados');
    
    // Criar pool de conexão
    const pool = new Pool({
      connectionString: dbConnectionString,
    });
    
    try {
      // Iniciar uma transação
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        await client.query(sqlContent);
        await client.query('COMMIT');
        console.log(`Arquivo SQL ${filePath} executado com sucesso`);
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Erro ao executar SQL ${filePath}:`, error);
        return false;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erro ao conectar ao banco de dados:', error);
      return false;
    } finally {
      await pool.end();
    }
  } else {
    console.log('Usando Supabase para executar SQL');
    
    // Tentar executar usando Supabase
    try {
      // Verificar se a função execute_sql existe
      const { data: rpcExists, error: rpcError } = await supabase.rpc('execute_sql', { query: 'SELECT 1' }).maybeSingle();
      
      if (rpcError && rpcError.message.includes('function "execute_sql" does not exist')) {
        console.error('Erro: Função execute_sql não existe no Supabase');
        console.log('Tentando executar usando método alternativo...');
        
        // Tentar executar usando o endpoint REST
        const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ query: sqlContent })
        });
        
        if (!response.ok) {
          console.error('Erro ao executar SQL via REST:', await response.text());
          return false;
        }
        
        console.log(`Arquivo SQL ${filePath} executado com sucesso via REST`);
        return true;
      } else {
        // Executar usando a função RPC
        const { error } = await supabase.rpc('execute_sql', { query: sqlContent });
        
        if (error) {
          console.error('Erro ao executar SQL via RPC:', error);
          return false;
        }
        
        console.log(`Arquivo SQL ${filePath} executado com sucesso via RPC`);
        return true;
      }
    } catch (error) {
      console.error('Erro ao executar SQL:', error);
      return false;
    }
  }
}

// Função principal
async function main() {
  console.log('Iniciando configuração de segurança...');
  
  // Lista de arquivos SQL para executar
  const sqlFiles = [
    'add-password-hash-column.sql',
    'create-profile-tables.sql',
    'create-app-secrets-table.sql'
  ];
  
  // Executar cada arquivo SQL
  for (const file of sqlFiles) {
    const filePath = path.join(__dirname, file);
    const success = await executeSqlFile(filePath);
    
    if (!success) {
      console.error(`Falha ao executar ${file}`);
      process.exit(1);
    }
  }
  
  console.log('Configuração de segurança concluída com sucesso!');
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
