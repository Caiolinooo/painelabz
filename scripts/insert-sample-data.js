// Script para inserir dados de exemplo no banco de dados
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function insertSampleData() {
  try {
    console.log('Iniciando inserção de dados de exemplo...');
    
    // Criar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      console.error('Certifique-se de definir NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar se já existem funcionários
    console.log('Verificando se já existem funcionários...');
    const { data: funcionarios, error: funcionariosError } = await supabase
      .from('funcionarios')
      .select('id, nome')
      .limit(5);
    
    if (funcionariosError) {
      console.error('Erro ao verificar funcionários:', funcionariosError);
      return;
    }
    
    console.log(`Encontrados ${funcionarios.length} funcionários.`);
    
    // Se não existirem funcionários, inserir alguns
    if (funcionarios.length === 0) {
      console.log('Inserindo funcionários de exemplo...');
      
      const funcionariosExemplo = [
        { nome: 'João Silva', cargo: 'Gerente', departamento: 'TI', email: 'joao.silva@example.com' },
        { nome: 'Maria Santos', cargo: 'Desenvolvedor', departamento: 'TI', email: 'maria.santos@example.com' },
        { nome: 'Pedro Oliveira', cargo: 'Analista', departamento: 'RH', email: 'pedro.oliveira@example.com' },
        { nome: 'Ana Costa', cargo: 'Coordenador', departamento: 'Marketing', email: 'ana.costa@example.com' }
      ];
      
      const { data: novosFuncionarios, error: novosFuncionariosError } = await supabase
        .from('funcionarios')
        .insert(funcionariosExemplo)
        .select();
      
      if (novosFuncionariosError) {
        console.error('Erro ao inserir funcionários:', novosFuncionariosError);
        return;
      }
      
      console.log(`${novosFuncionarios.length} funcionários inseridos com sucesso!`);
      
      // Atualizar a lista de funcionários
      funcionarios.push(...novosFuncionarios);
    }
    
    // Verificar se já existem avaliações
    console.log('Verificando se já existem avaliações...');
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes')
      .select('id, funcionario_id, avaliador_id')
      .limit(5);
    
    if (avaliacoesError) {
      console.error('Erro ao verificar avaliações:', avaliacoesError);
      return;
    }
    
    console.log(`Encontradas ${avaliacoes.length} avaliações.`);
    
    // Se não existirem avaliações, inserir algumas
    if (avaliacoes.length === 0 && funcionarios.length >= 2) {
      console.log('Inserindo avaliações de exemplo...');
      
      // Obter IDs de funcionários para usar como avaliador e avaliado
      const avaliadorId = funcionarios[0].id;
      const funcionarioId = funcionarios[1].id;
      
      const avaliacoesExemplo = [
        {
          funcionario_id: funcionarioId,
          avaliador_id: avaliadorId,
          periodo: '2025-Q1',
          data_inicio: new Date('2025-01-01').toISOString(),
          data_fim: new Date('2025-03-31').toISOString(),
          status: 'pending',
          observacoes: 'Avaliação do primeiro trimestre de 2025',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          funcionario_id: funcionarioId,
          avaliador_id: avaliadorId,
          periodo: '2024-Q4',
          data_inicio: new Date('2024-10-01').toISOString(),
          data_fim: new Date('2024-12-31').toISOString(),
          status: 'completed',
          pontuacao_total: 4.5,
          observacoes: 'Avaliação do quarto trimestre de 2024',
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 dias atrás
          updated_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          data_criacao: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          data_atualizacao: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      const { data: novasAvaliacoes, error: novasAvaliacoesError } = await supabase
        .from('avaliacoes')
        .insert(avaliacoesExemplo)
        .select();
      
      if (novasAvaliacoesError) {
        console.error('Erro ao inserir avaliações:', novasAvaliacoesError);
        return;
      }
      
      console.log(`${novasAvaliacoes.length} avaliações inseridas com sucesso!`);
    }
    
    console.log('Inserção de dados de exemplo concluída!');
  } catch (err) {
    console.error('Erro ao inserir dados de exemplo:', err);
  }
}

// Executar o script
insertSampleData();
