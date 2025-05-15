/**
 * Script para testar a rota da API de avaliações
 */

const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Função para testar a rota da API
async function testApiRoute() {
  try {
    console.log('Testando rota da API de avaliações...');

    // URL base da API (ajuste conforme necessário)
    const baseUrl = 'http://localhost:3000';
    
    // Obter um token de autenticação (simulação)
    console.log('Obtendo token de autenticação...');
    
    // Testar a rota de avaliações
    console.log('Testando rota /api/avaliacao-desempenho/avaliacoes...');
    
    try {
      const response = await fetch(`${baseUrl}/api/avaliacao-desempenho/avaliacoes`, {
        headers: {
          'Content-Type': 'application/json',
          // Não incluímos o token aqui para simular um erro de autenticação
        }
      });
      
      console.log('Status da resposta:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos:', JSON.stringify(data, null, 2));
      } else {
        console.log('Erro na resposta:', response.statusText);
        
        try {
          const errorData = await response.json();
          console.log('Detalhes do erro:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log('Não foi possível obter detalhes do erro');
        }
      }
    } catch (error) {
      console.error('Erro ao fazer requisição para a API:', error);
    }
    
    console.log('Teste concluído!');
  } catch (error) {
    console.error('Erro ao testar rota da API:', error);
  }
}

// Executar o teste
testApiRoute();
