/**
 * Script para corrigir os problemas no frontend do módulo de avaliação
 * 
 * Este script deve ser executado no console do navegador para verificar
 * os problemas no frontend e ajudar a diagnosticar os erros.
 */

// Função para verificar se a tabela avaliacoes existe
async function checkAvaliacoesTable() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      return false;
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/avaliacoes?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar tabela avaliacoes:', error);
    return false;
  }
}

// Função para verificar se a tabela avaliacoes_desempenho existe
async function checkAvaliacoesDesempenhoTable() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      return false;
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/avaliacoes_desempenho?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar tabela avaliacoes_desempenho:', error);
    return false;
  }
}

// Função para verificar se a view vw_avaliacoes_desempenho existe
async function checkAvaliacoesView() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      return false;
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/vw_avaliacoes_desempenho?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar view vw_avaliacoes_desempenho:', error);
    return false;
  }
}

// Função para verificar se a tabela funcionarios existe e tem os campos corretos
async function checkFuncionariosTable() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      return false;
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/funcionarios?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    console.log('Dados da tabela funcionarios:', data);
    
    // Verificar se tem pelo menos um registro
    if (data.length === 0) {
      console.warn('Tabela funcionarios está vazia');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar tabela funcionarios:', error);
    return false;
  }
}

// Executar as verificações
async function runDiagnostics() {
  console.log('Iniciando diagnóstico do módulo de avaliação...');
  
  const avaliacoesExists = await checkAvaliacoesTable();
  console.log('Tabela avaliacoes existe:', avaliacoesExists);
  
  const avaliacoesDesempenhoExists = await checkAvaliacoesDesempenhoTable();
  console.log('Tabela avaliacoes_desempenho existe:', avaliacoesDesempenhoExists);
  
  const avaliacoesViewExists = await checkAvaliacoesView();
  console.log('View vw_avaliacoes_desempenho existe:', avaliacoesViewExists);
  
  const funcionariosOk = await checkFuncionariosTable();
  console.log('Tabela funcionarios está ok:', funcionariosOk);
  
  console.log('Diagnóstico concluído.');
}

// Executar diagnóstico
runDiagnostics();
