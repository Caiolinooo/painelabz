/**
 * Script para testar a API de avaliações
 * 
 * Este script deve ser executado para testar os endpoints da API de avaliações.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testAvaliacaoApi() {
  try {
    console.log('Iniciando teste da API de avaliações...');
    
    // Criar cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis de ambiente do Supabase não definidas');
      console.error('Certifique-se de definir NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Testar busca de funcionários
    console.log('Testando busca de funcionários...');
    const { data: funcionarios, error: funcionariosError } = await supabase
      .from('funcionarios')
      .select(`
        id, 
        nome, 
        email, 
        cargo,
        user_id,
        users:user_id (id, role)
      `)
      .is('deleted_at', null)
      .order('nome', { ascending: true })
      .limit(5);
    
    if (funcionariosError) {
      console.error('Erro ao buscar funcionários:', funcionariosError);
    } else {
      console.log('Funcionários encontrados:', funcionarios.length);
      if (funcionarios.length > 0) {
        console.log('Exemplo de funcionário:', funcionarios[0]);
      }
    }
    
    // Testar busca de avaliações
    console.log('Testando busca de avaliações...');
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes')
      .select(`
        *,
        avaliador:avaliador_id(id, nome, email),
        funcionario:funcionario_id(id, nome, email)
      `)
      .is('deleted_at', null)
      .order('data_criacao', { ascending: false })
      .limit(5);
    
    if (avaliacoesError) {
      console.error('Erro ao buscar avaliações:', avaliacoesError);
    } else {
      console.log('Avaliações encontradas:', avaliacoes.length);
      if (avaliacoes.length > 0) {
        console.log('Exemplo de avaliação:', avaliacoes[0]);
      }
    }
    
    // Testar busca de avaliações pela view
    console.log('Testando busca de avaliações pela view...');
    const { data: avaliacoesView, error: avaliacoesViewError } = await supabase
      .from('vw_avaliacoes_desempenho')
      .select('*')
      .limit(5);
    
    if (avaliacoesViewError) {
      console.error('Erro ao buscar avaliações pela view:', avaliacoesViewError);
    } else {
      console.log('Avaliações encontradas pela view:', avaliacoesView.length);
      if (avaliacoesView.length > 0) {
        console.log('Exemplo de avaliação pela view:', avaliacoesView[0]);
      }
    }
    
    // Testar criação de avaliação (apenas se houver funcionários)
    if (funcionarios && funcionarios.length >= 2) {
      console.log('Testando criação de avaliação...');
      
      const avaliador = funcionarios[0];
      const funcionario = funcionarios[1];
      
      const { data: novaAvaliacao, error: novaAvaliacaoError } = await supabase
        .from('avaliacoes')
        .insert({
          avaliador_id: avaliador.id,
          funcionario_id: funcionario.id,
          periodo: `Teste-${new Date().toISOString().split('T')[0]}`,
          status: 'pending',
          observacoes: 'Avaliação de teste criada pelo script',
          data_criacao: new Date().toISOString()
        })
        .select();
      
      if (novaAvaliacaoError) {
        console.error('Erro ao criar avaliação:', novaAvaliacaoError);
      } else {
        console.log('Avaliação criada com sucesso:', novaAvaliacao[0]);
        
        // Limpar a avaliação de teste
        console.log('Removendo avaliação de teste...');
        const { error: deleteError } = await supabase
          .from('avaliacoes')
          .delete()
          .eq('id', novaAvaliacao[0].id);
        
        if (deleteError) {
          console.error('Erro ao remover avaliação de teste:', deleteError);
        } else {
          console.log('Avaliação de teste removida com sucesso!');
        }
      }
    }
    
    console.log('Teste da API de avaliações concluído!');
  } catch (err) {
    console.error('Erro ao testar API de avaliações:', err);
  }
}

// Executar o script
testAvaliacaoApi();
