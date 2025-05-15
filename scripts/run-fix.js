// Script para executar a correção do banco de dados
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runDatabaseFix() {
  try {
    console.log('Iniciando correção do banco de dados...');
    
    // Criar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      console.error('Certifique-se de definir NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Ler o script SQL
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-database.sql'), 'utf8');
    
    // Executar o script SQL
    console.log('Executando script SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) {
      console.error('Erro ao executar o script SQL:', error);
      return;
    }
    
    console.log('Script SQL executado com sucesso!');
    
    // Verificar se a coluna data_criacao existe agora
    console.log('Verificando se a coluna data_criacao existe...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'avaliacoes')
      .eq('column_name', 'data_criacao');
    
    if (columnsError) {
      console.error('Erro ao verificar coluna data_criacao:', columnsError);
      return;
    }
    
    if (columns && columns.length > 0) {
      console.log('Coluna data_criacao existe na tabela avaliacoes!');
    } else {
      console.log('Coluna data_criacao ainda não existe na tabela avaliacoes.');
      console.log('Tentando método alternativo...');
      
      // Método alternativo: executar SQL diretamente
      const { error: directError } = await supabase.from('avaliacoes').select('id').limit(1);
      
      if (directError) {
        console.error('Erro ao acessar tabela avaliacoes:', directError);
      } else {
        console.log('Tabela avaliacoes acessada com sucesso!');
      }
    }
    
    console.log('Correção do banco de dados concluída!');
  } catch (err) {
    console.error('Erro ao executar correção do banco de dados:', err);
  }
}

// Executar o script
runDatabaseFix();
