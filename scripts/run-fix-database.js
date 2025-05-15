// Script para executar o SQL de correção do banco de dados
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runFixDatabase() {
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
      console.log('Tabela funcionarios não existe! Criando...');
      
      // Criar tabela funcionarios
      const { error: createFuncError } = await supabase
        .from('funcionarios')
        .insert([
          { 
            nome: 'João Silva', 
            cargo: 'Gerente', 
            departamento: 'TI', 
            email: 'joao.silva@example.com' 
          }
        ]);
      
      if (createFuncError) {
        console.error('Erro ao criar tabela funcionarios:', createFuncError);
        
        // Tentar criar manualmente
        const createFuncSQL = `
          CREATE TABLE funcionarios (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nome TEXT NOT NULL,
            cargo TEXT,
            departamento TEXT,
            email TEXT,
            user_id UUID,
            deleted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        
        try {
          await supabase.rpc('exec_sql', { sql: createFuncSQL });
          console.log('Tabela funcionarios criada manualmente!');
        } catch (err) {
          console.error('Erro ao criar tabela funcionarios manualmente:', err);
        }
      } else {
        console.log('Tabela funcionarios criada com sucesso!');
      }
    } else {
      console.log('Tabela funcionarios já existe!');
    }
    
    // Verificar se a tabela avaliacoes existe
    console.log('Verificando se a tabela avaliacoes existe...');
    const { data: avalTables, error: avalTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'avaliacoes');
    
    if (avalTablesError) {
      console.error('Erro ao verificar tabela avaliacoes:', avalTablesError);
      return;
    }
    
    if (!avalTables || avalTables.length === 0) {
      console.log('Tabela avaliacoes não existe! Criando...');
      
      // Criar tabela avaliacoes
      const createAvalSQL = `
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      try {
        await supabase.rpc('exec_sql', { sql: createAvalSQL });
        console.log('Tabela avaliacoes criada manualmente!');
      } catch (err) {
        console.error('Erro ao criar tabela avaliacoes manualmente:', err);
      }
    } else {
      console.log('Tabela avaliacoes já existe!');
      
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
        console.log('Coluna data_criacao não existe! Adicionando...');
        
        // Adicionar coluna data_criacao
        const addColumnSQL = `
          ALTER TABLE avaliacoes
          ADD COLUMN data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          
          UPDATE avaliacoes
          SET data_criacao = created_at
          WHERE data_criacao IS NULL;
        `;
        
        try {
          await supabase.rpc('exec_sql', { sql: addColumnSQL });
          console.log('Coluna data_criacao adicionada manualmente!');
        } catch (err) {
          console.error('Erro ao adicionar coluna data_criacao manualmente:', err);
        }
      } else {
        console.log('Coluna data_criacao já existe!');
      }
    }
    
    // Verificar se há dados na tabela funcionarios
    console.log('Verificando se há dados na tabela funcionarios...');
    const { data: funcionarios, error: funcionariosError } = await supabase
      .from('funcionarios')
      .select('id, nome')
      .limit(5);
    
    if (funcionariosError) {
      console.error('Erro ao verificar dados da tabela funcionarios:', funcionariosError);
      return;
    }
    
    console.log(`Encontrados ${funcionarios.length} funcionários na tabela.`);
    
    if (funcionarios.length === 0) {
      console.log('Nenhum funcionário encontrado. Inserindo dados de exemplo...');
      
      // Inserir dados de exemplo
      const { error: insertError } = await supabase
        .from('funcionarios')
        .insert([
          { 
            nome: 'João Silva', 
            cargo: 'Gerente', 
            departamento: 'TI', 
            email: 'joao.silva@example.com' 
          },
          { 
            nome: 'Maria Santos', 
            cargo: 'Desenvolvedor', 
            departamento: 'TI', 
            email: 'maria.santos@example.com' 
          }
        ]);
      
      if (insertError) {
        console.error('Erro ao inserir dados de exemplo na tabela funcionarios:', insertError);
      } else {
        console.log('Dados de exemplo inseridos na tabela funcionarios!');
      }
    }
    
    // Verificar se há dados na tabela avaliacoes
    console.log('Verificando se há dados na tabela avaliacoes...');
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes')
      .select('id, funcionario_id, avaliador_id, periodo')
      .limit(5);
    
    if (avaliacoesError) {
      console.error('Erro ao verificar dados da tabela avaliacoes:', avaliacoesError);
      return;
    }
    
    console.log(`Encontradas ${avaliacoes.length} avaliações na tabela.`);
    
    if (avaliacoes.length === 0) {
      console.log('Nenhuma avaliação encontrada. Inserindo dados de exemplo...');
      
      // Buscar funcionários novamente (caso tenham sido inseridos)
      const { data: newFuncionarios, error: newFuncionariosError } = await supabase
        .from('funcionarios')
        .select('id, nome')
        .limit(2);
      
      if (newFuncionariosError || !newFuncionarios || newFuncionarios.length < 2) {
        console.error('Erro ao buscar funcionários para inserir avaliações:', newFuncionariosError || 'Funcionários insuficientes');
        return;
      }
      
      // Inserir dados de exemplo
      const { error: insertAvalError } = await supabase
        .from('avaliacoes')
        .insert([
          { 
            funcionario_id: newFuncionarios[0].id, 
            avaliador_id: newFuncionarios[1].id, 
            periodo: '2025-Q1', 
            status: 'pending',
            observacoes: 'Avaliação de exemplo',
            data_criacao: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ]);
      
      if (insertAvalError) {
        console.error('Erro ao inserir dados de exemplo na tabela avaliacoes:', insertAvalError);
      } else {
        console.log('Dados de exemplo inseridos na tabela avaliacoes!');
      }
    }
    
    console.log('Correção do banco de dados concluída!');
  } catch (err) {
    console.error('Erro ao executar correção do banco de dados:', err);
  }
}

// Executar o script
runFixDatabase();
