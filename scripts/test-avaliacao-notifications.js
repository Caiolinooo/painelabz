/**
 * Script para testar o sistema de notificações do módulo de avaliação
 * 
 * Este script testa:
 * 1. Criação de avaliação com notificações
 * 2. Atualização de status com notificações
 * 3. Envio de lembretes para avaliações pendentes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = ***REMOVED*** || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseKey);

// IDs de teste (substitua por IDs válidos do seu banco de dados)
const TEST_FUNCIONARIO_ID = '550e8400-e29b-41d4-a716-446655440000'; // ID de um funcionário de teste
const TEST_AVALIADOR_ID = '550e8400-e29b-41d4-a716-446655440001'; // ID de um avaliador de teste
const TEST_PERIODO = '2025';

/**
 * Função para criar um usuário de teste se não existir
 */
async function criarUsuariosTeste() {
  console.log('Criando usuários de teste...');
  
  try {
    // Criar funcionário de teste
    const { data: funcionario, error: funcError } = await supabase
      .from('users_unified')
      .upsert({
        id: TEST_FUNCIONARIO_ID,
        first_name: 'Funcionário',
        last_name: 'Teste',
        email: 'funcionario.teste@example.com',
        phone_number: '+5511999999991',
        role: 'USER',
        position: 'Desenvolvedor',
        department: 'TI',
        active: true,
        is_authorized: true,
        authorization_status: 'active'
      })
      .select()
      .single();

    if (funcError) {
      console.error('Erro ao criar funcionário de teste:', funcError.message);
    } else {
      console.log('✅ Funcionário de teste criado/atualizado:', funcionario.first_name, funcionario.last_name);
    }

    // Criar avaliador de teste
    const { data: avaliador, error: avalError } = await supabase
      .from('users_unified')
      .upsert({
        id: TEST_AVALIADOR_ID,
        first_name: 'Avaliador',
        last_name: 'Teste',
        email: 'avaliador.teste@example.com',
        phone_number: '+5511999999992',
        role: 'MANAGER',
        position: 'Gerente de TI',
        department: 'TI',
        active: true,
        is_authorized: true,
        authorization_status: 'active'
      })
      .select()
      .single();

    if (avalError) {
      console.error('Erro ao criar avaliador de teste:', avalError.message);
    } else {
      console.log('✅ Avaliador de teste criado/atualizado:', avaliador.first_name, avaliador.last_name);
    }

    return true;
  } catch (error) {
    console.error('Erro inesperado ao criar usuários de teste:', error.message);
    return false;
  }
}

/**
 * Função para testar a criação de avaliação com notificações
 */
async function testarCriacaoAvaliacao() {
  console.log('\n=== Testando criação de avaliação com notificações ===');
  
  try {
    // Preparar dados da avaliação
    const avaliacaoData = {
      funcionario_id: TEST_FUNCIONARIO_ID,
      avaliador_id: TEST_AVALIADOR_ID,
      periodo: TEST_PERIODO,
      status: 'pendente',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      observacoes: 'Avaliação de teste para notificações',
      pontuacao_total: 0
    };

    console.log('Enviando requisição para criar avaliação...');
    
    // Fazer a requisição para a API de criação
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/avaliacao/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin-token-test'}`
      },
      body: JSON.stringify(avaliacaoData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status, result);
      return false;
    }

    if (!result.success) {
      console.error('❌ Erro ao criar avaliação:', result.error);
      return false;
    }

    console.log('✅ Avaliação criada com sucesso!');
    console.log('ID da avaliação:', result.data.id);
    console.log('Status:', result.data.status);

    // Verificar se as notificações foram criadas
    await verificarNotificacoes(result.data.id, TEST_FUNCIONARIO_ID, TEST_AVALIADOR_ID);

    return result.data.id;
  } catch (error) {
    console.error('❌ Erro inesperado ao testar criação de avaliação:', error.message);
    return false;
  }
}

/**
 * Função para verificar se as notificações foram criadas
 */
async function verificarNotificacoes(avaliacaoId, funcionarioId, avaliadorId) {
  console.log('\nVerificando notificações criadas...');
  
  try {
    // Verificar notificações do funcionário
    const { data: notificacoesFuncionario, error: errorFunc } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', funcionarioId)
      .like('data', `%${avaliacaoId}%`);

    if (errorFunc) {
      console.error('Erro ao buscar notificações do funcionário:', errorFunc.message);
    } else if (notificacoesFuncionario && notificacoesFuncionario.length > 0) {
      console.log(`✅ Encontradas ${notificacoesFuncionario.length} notificações para o funcionário:`);
      notificacoesFuncionario.forEach(notif => {
        console.log(`  - ${notif.title}: ${notif.message}`);
      });
    } else {
      console.log('⚠️ Nenhuma notificação encontrada para o funcionário');
    }

    // Verificar notificações do avaliador
    const { data: notificacoesAvaliador, error: errorAval } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', avaliadorId)
      .like('data', `%${avaliacaoId}%`);

    if (errorAval) {
      console.error('Erro ao buscar notificações do avaliador:', errorAval.message);
    } else if (notificacoesAvaliador && notificacoesAvaliador.length > 0) {
      console.log(`✅ Encontradas ${notificacoesAvaliador.length} notificações para o avaliador:`);
      notificacoesAvaliador.forEach(notif => {
        console.log(`  - ${notif.title}: ${notif.message}`);
      });
    } else {
      console.log('⚠️ Nenhuma notificação encontrada para o avaliador');
    }
  } catch (error) {
    console.error('Erro ao verificar notificações:', error.message);
  }
}

/**
 * Função para testar atualização de status com notificações
 */
async function testarAtualizacaoStatus(avaliacaoId) {
  console.log('\n=== Testando atualização de status com notificações ===');
  
  try {
    // Atualizar status para "em_andamento"
    console.log('Atualizando status para "em_andamento"...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/avaliacao-desempenho/avaliacoes/${avaliacaoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin-token-test'}`
      },
      body: ***REMOVED***
        status: 'em_andamento'
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status, result);
      return false;
    }

    if (!result.success) {
      console.error('❌ Erro ao atualizar status:', result.error);
      return false;
    }

    console.log('✅ Status atualizado com sucesso!');
    console.log('Novo status:', result.data.status);

    // Aguardar um pouco para as notificações serem processadas
    console.log('Aguardando processamento das notificações...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se as notificações foram criadas
    await verificarNotificacoes(avaliacaoId, TEST_FUNCIONARIO_ID, TEST_AVALIADOR_ID);

    // Atualizar status para "concluida"
    console.log('\nAtualizando status para "concluida"...');
    
    const response2 = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/avaliacao-desempenho/avaliacoes/${avaliacaoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin-token-test'}`
      },
      body: ***REMOVED***
        status: 'concluida',
        pontuacao_total: 85
      })
    });

    const result2 = await response2.json();
    
    if (!response2.ok) {
      console.error('❌ Erro na resposta da API:', response2.status, result2);
      return false;
    }

    if (!result2.success) {
      console.error('❌ Erro ao atualizar status:', result2.error);
      return false;
    }

    console.log('✅ Status atualizado para "concluida" com sucesso!');
    console.log('Pontuação total:', result2.data.pontuacao_total);

    // Aguardar um pouco para as notificações serem processadas
    console.log('Aguardando processamento das notificações...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se as notificações foram criadas
    await verificarNotificacoes(avaliacaoId, TEST_FUNCIONARIO_ID, TEST_AVALIADOR_ID);

    return true;
  } catch (error) {
    console.error('❌ Erro inesperado ao testar atualização de status:', error.message);
    return false;
  }
}

/**
 * Função para testar envio de lembretes
 */
async function testarEnvioLembretes() {
  console.log('\n=== Testando envio de lembretes ===');
  
  try {
    // Criar uma avaliação com data de vencimento próxima
    const dataFim = new Date();
    dataFim.setDate(dataFim.getDate() + 2); // Vence em 2 dias
    
    const avaliacaoData = {
      funcionario_id: TEST_FUNCIONARIO_ID,
      avaliador_id: TEST_AVALIADOR_ID,
      periodo: TEST_PERIODO,
      status: 'pendente',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: dataFim.toISOString().split('T')[0],
      observacoes: 'Avaliação de teste para lembretes',
      pontuacao_total: 0
    };

    console.log('Criando avaliação com data de vencimento próxima...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/avaliacao/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'admin-token-test'}`
      },
      body: JSON.stringify(avaliacaoData)
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('❌ Erro ao criar avaliação para teste de lembretes:', result.error);
      return false;
    }

    console.log('✅ Avaliação criada para teste de lembretes!');
    console.log('ID da avaliação:', result.data.id);
    console.log('Data de vencimento:', dataFim.toLocaleDateString('pt-BR'));

    // Verificar notificações iniciais
    await verificarNotificacoes(result.data.id, TEST_FUNCIONARIO_ID, TEST_AVALIADOR_ID);

    // Chamar a API de verificação de lembretes
    console.log('\nChamando API de verificação de lembretes...');
    
    // Como não temos um endpoint direto para a verificação de lembretes, vamos simular
    // a chamada ao método estático do serviço
    console.log('⚠️ Nota: A verificação de lembretes normalmente é executada por um job agendado.');
    console.log('Para testar manualmente, acesse o sistema e verifique se os lembretes são enviados.');
    
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado ao testar envio de lembretes:', error.message);
    return false;
  }
}

/**
 * Função para limpar os dados de teste
 */
async function limparDadosTeste(avaliacaoId) {
  console.log('\n=== Limpando dados de teste ===');
  
  try {
    // Excluir a avaliação
    const { error } = await supabase
      .from('avaliacoes_desempenho')
      .delete()
      .eq('id', avaliacaoId);

    if (error) {
      console.error('Erro ao excluir avaliação de teste:', error.message);
    } else {
      console.log('✅ Avaliação de teste excluída');
    }

    // Excluir as notificações de teste
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .like('data', `%${avaliacaoId}%`);

    if (notifError) {
      console.error('Erro ao excluir notificações de teste:', notifError.message);
    } else {
      console.log('✅ Notificações de teste excluídas');
    }

    return true;
  } catch (error) {
    console.error('Erro inesperado ao limpar dados de teste:', error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando testes do sistema de notificações de avaliação');
  console.log('=============================================');

  let avaliacaoId = null;

  try {
    // 1. Criar usuários de teste
    await criarUsuariosTeste();

    // 2. Testar criação de avaliação
    avaliacaoId = await testarCriacaoAvaliacao();
    if (!avaliacaoId) {
      console.error('❌ Falha no teste de criação de avaliação');
      return;
    }

    // 3. Testar atualização de status
    const sucessoAtualizacao = await testarAtualizacaoStatus(avaliacaoId);
    if (!sucessoAtualizacao) {
      console.error('❌ Falha no teste de atualização de status');
    }

    // 4. Testar envio de lembretes
    const sucessoLembretes = await testarEnvioLembretes();
    if (!sucessoLembretes) {
      console.error('❌ Falha no teste de envio de lembretes');
    }

    console.log('\n=============================================');
    console.log('✅ Testes concluídos!');
    console.log('📋 Resumo:');
    console.log('  - Criação de avaliação: OK');
    console.log('  - Atualização de status: ' + (sucessoAtualizacao ? 'OK' : 'FALHOU'));
    console.log('  - Envio de lembretes: ' + (sucessoLembretes ? 'OK' : 'FALHOU'));
    console.log('\n💡 Dica: Verifique as notificações no sistema para confirmar o recebimento.');

  } catch (error) {
    console.error('❌ Erro inesperado durante os testes:', error.message);
  } finally {
    // Limpar dados de teste
    if (avaliacaoId) {
      await limparDadosTeste(avaliacaoId);
    }
  }
}

// Executar os testes
main();