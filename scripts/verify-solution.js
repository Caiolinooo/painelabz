// Script para verificar se a solução está funcionando
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function verifySolution() {
  try {
    console.log('Verificando se a solução está funcionando...');
    
    // Verificar se o servidor está rodando
    console.log('Verificando se o servidor está rodando...');
    try {
      const response = await axios.get('http://localhost:3000/api/health');
      console.log('Servidor está rodando:', response.data);
    } catch (err) {
      console.error('Erro ao verificar servidor:', err.message);
      console.log('O servidor pode não estar rodando. Execute "npm run dev" para iniciar o servidor.');
      return;
    }
    
    // Criar cliente Supabase
    console.log('Conectando ao Supabase...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      console.error('Certifique-se de definir NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar se a tabela avaliacoes existe
    console.log('Verificando se a tabela avaliacoes existe...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'avaliacoes');
    
    if (tablesError) {
      console.error('Erro ao verificar tabela avaliacoes:', tablesError);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.error('Tabela avaliacoes não existe!');
      console.log('Execute o script fix-all.js para criar a tabela.');
      return;
    }
    
    console.log('Tabela avaliacoes existe!');
    
    // Verificar se a coluna data_criacao existe
    console.log('Verificando se a coluna data_criacao existe...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'avaliacoes')
      .eq('column_name', 'data_criacao');
    
    if (columnsError) {
      console.error('Erro ao verificar coluna data_criacao:', columnsError);
      return;
    }
    
    if (!columns || columns.length === 0) {
      console.error('Coluna data_criacao não existe!');
      console.log('Execute o script fix-all.js para adicionar a coluna.');
      return;
    }
    
    console.log('Coluna data_criacao existe!');
    
    // Verificar se há dados na tabela avaliacoes
    console.log('Verificando se há dados na tabela avaliacoes...');
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes')
      .select('id, funcionario_id, avaliador_id, periodo, status')
      .limit(5);
    
    if (avaliacoesError) {
      console.error('Erro ao verificar dados da tabela avaliacoes:', avaliacoesError);
      return;
    }
    
    console.log(`Encontradas ${avaliacoes.length} avaliações.`);
    
    if (avaliacoes.length === 0) {
      console.warn('Nenhuma avaliação encontrada!');
      console.log('Execute o script insert-sample-data.js para inserir dados de exemplo.');
    } else {
      console.log('Exemplo de avaliação:');
      console.log(avaliacoes[0]);
    }
    
    // Verificar se a view vw_avaliacoes_desempenho existe
    console.log('Verificando se a view vw_avaliacoes_desempenho existe...');
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'vw_avaliacoes_desempenho');
    
    if (viewsError) {
      console.error('Erro ao verificar view vw_avaliacoes_desempenho:', viewsError);
      return;
    }
    
    if (!views || views.length === 0) {
      console.warn('View vw_avaliacoes_desempenho não existe!');
      console.log('Execute o script fix-all.js para criar a view.');
    } else {
      console.log('View vw_avaliacoes_desempenho existe!');
      
      // Verificar se a view retorna dados
      console.log('Verificando se a view retorna dados...');
      const { data: viewData, error: viewDataError } = await supabase
        .from('vw_avaliacoes_desempenho')
        .select('*')
        .limit(5);
      
      if (viewDataError) {
        console.error('Erro ao verificar dados da view:', viewDataError);
        return;
      }
      
      console.log(`A view retornou ${viewData.length} registros.`);
      
      if (viewData.length > 0) {
        console.log('Exemplo de registro da view:');
        console.log(viewData[0]);
      }
    }
    
    console.log('\nVerificação concluída!');
    console.log('A solução parece estar funcionando corretamente.');
    console.log('Acesse http://localhost:3000/avaliacao para verificar a interface do usuário.');
  } catch (err) {
    console.error('Erro ao verificar solução:', err);
  }
}

// Executar o script
verifySolution();
