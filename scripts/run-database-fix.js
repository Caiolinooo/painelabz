/**
 * Script para executar as correções no banco de dados
 * 
 * Este script deve ser executado para aplicar as correções no banco de dados
 * do módulo de avaliação.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runDatabaseFix() {
  try {
    console.log('Iniciando correção do banco de dados...');
    
    // Criar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      console.error('Certifique-se de definir NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Ler o script SQL
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-avaliacao-database-complete.sql'), 'utf8');
    
    // Executar o script SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) {
      console.error('Erro ao executar o script SQL:', error);
      return;
    }
    
    console.log('Script SQL executado com sucesso!');
    console.log('Resultado:', data);
    
    // Verificar se as tabelas foram criadas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['avaliacoes', 'funcionarios']);
    
    if (tablesError) {
      console.error('Erro ao verificar tabelas:', tablesError);
      return;
    }
    
    console.log('Tabelas encontradas:', tables.map(t => t.table_name).join(', '));
    
    // Verificar se a view foi criada
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'vw_avaliacoes_desempenho');
    
    if (viewsError) {
      console.error('Erro ao verificar views:', viewsError);
      return;
    }
    
    console.log('Views encontradas:', views.map(v => v.table_name).join(', '));
    
    // Verificar se há funcionários
    const { data: funcionarios, error: funcionariosError } = await supabase
      .from('funcionarios')
      .select('id, nome, email')
      .limit(5);
    
    if (funcionariosError) {
      console.error('Erro ao verificar funcionários:', funcionariosError);
      return;
    }
    
    console.log('Funcionários encontrados:', funcionarios.length);
    if (funcionarios.length > 0) {
      console.log('Exemplo de funcionário:', funcionarios[0]);
    }
    
    console.log('Correção do banco de dados concluída com sucesso!');
  } catch (err) {
    console.error('Erro ao executar correção do banco de dados:', err);
  }
}

// Executar o script
runDatabaseFix();
