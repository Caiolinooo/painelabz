// Script para verificar a estrutura e os dados do banco de dados
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('Iniciando verificação do banco de dados...');
    
    // Criar cliente Supabase
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
      console.log('Tabela avaliacoes não existe!');
      
      // Criar a tabela avaliacoes
      console.log('Criando tabela avaliacoes...');
      
      const createTableSQL = `
        CREATE TABLE avaliacoes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          funcionario_id UUID NOT NULL,
          avaliador_id UUID NOT NULL,
          periodo TEXT NOT NULL,
          data_inicio DATE DEFAULT CURRENT_DATE,
          data_fim DATE DEFAULT (CURRENT_DATE + INTERVAL '3 months'),
          status TEXT NOT NULL DEFAULT 'pending',
          pontuacao_total FLOAT DEFAULT 0,
          observacoes TEXT,
          deleted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (createError) {
        console.error('Erro ao criar tabela avaliacoes:', createError);
        console.log('Tentando método alternativo...');
      } else {
        console.log('Tabela avaliacoes criada com sucesso!');
      }
    } else {
      console.log('Tabela avaliacoes existe!');
    }
    
    // Verificar a estrutura da tabela avaliacoes
    console.log('Verificando estrutura da tabela avaliacoes...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'avaliacoes');
    
    if (columnsError) {
      console.error('Erro ao verificar colunas da tabela avaliacoes:', columnsError);
      return;
    }
    
    console.log('Colunas da tabela avaliacoes:');
    columns.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type})`);
    });
    
    // Verificar se a tabela funcionarios existe
    console.log('Verificando se a tabela funcionarios existe...');
    const { data: funcTables, error: funcTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'funcionarios');
    
    if (funcTablesError) {
      console.error('Erro ao verificar tabela funcionarios:', funcTablesError);
      return;
    }
    
    if (!funcTables || funcTables.length === 0) {
      console.log('Tabela funcionarios não existe!');
    } else {
      console.log('Tabela funcionarios existe!');
      
      // Verificar a estrutura da tabela funcionarios
      console.log('Verificando estrutura da tabela funcionarios...');
      const { data: funcColumns, error: funcColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'funcionarios');
      
      if (funcColumnsError) {
        console.error('Erro ao verificar colunas da tabela funcionarios:', funcColumnsError);
        return;
      }
      
      console.log('Colunas da tabela funcionarios:');
      funcColumns.forEach(column => {
        console.log(`- ${column.column_name} (${column.data_type})`);
      });
    }
    
    // Verificar se há dados na tabela avaliacoes
    console.log('Verificando se há dados na tabela avaliacoes...');
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes')
      .select('*')
      .limit(5);
    
    if (avaliacoesError) {
      console.error('Erro ao verificar dados da tabela avaliacoes:', avaliacoesError);
      return;
    }
    
    console.log(`Encontradas ${avaliacoes.length} avaliações na tabela.`);
    
    if (avaliacoes.length > 0) {
      console.log('Exemplo de avaliação:');
      console.log(avaliacoes[0]);
    } else {
      console.log('Nenhuma avaliação encontrada. Criando avaliação de teste...');
      
      // Verificar se há funcionários
      const { data: funcionarios, error: funcionariosError } = await supabase
        .from('funcionarios')
        .select('id, nome')
        .limit(2);
      
      if (funcionariosError) {
        console.error('Erro ao verificar funcionários:', funcionariosError);
        return;
      }
      
      if (funcionarios.length < 2) {
        console.log('Não há funcionários suficientes para criar uma avaliação de teste.');
        return;
      }
      
      // Criar avaliação de teste
      const { data: novaAvaliacao, error: novaAvaliacaoError } = await supabase
        .from('avaliacoes')
        .insert({
          funcionario_id: funcionarios[0].id,
          avaliador_id: funcionarios[1].id,
          periodo: 'Teste',
          status: 'pending',
          observacoes: 'Avaliação de teste',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (novaAvaliacaoError) {
        console.error('Erro ao criar avaliação de teste:', novaAvaliacaoError);
        return;
      }
      
      console.log('Avaliação de teste criada com sucesso!');
      console.log(novaAvaliacao[0]);
    }
    
    console.log('Verificação do banco de dados concluída!');
  } catch (err) {
    console.error('Erro ao verificar banco de dados:', err);
  }
}

// Executar o script
checkDatabase();
