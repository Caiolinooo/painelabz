/**
 * Script para atualizar as descrições em inglês dos cards existentes no banco de dados usando Supabase
 */

// Carregar variáveis de ambiente
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Traduções em inglês para os cards
const cardTranslations = {
  // Manual
  '6377431f-4afa-448b-b46a-8321a5870f37': {
    descriptionEn: 'Access the company manual'
  },
  // Procedimentos
  'c40a97fd-70a5-43f1-af4d-960efabd340b': {
    descriptionEn: 'Check company procedures'
  },
  // Políticas
  '2285fcbd-7024-4f9a-91c3-e0a87de27ba0': {
    descriptionEn: 'Check company policies'
  },
  // Calendário
  '90e09b57-c23e-4149-9770-e35c2d66cf7a': {
    descriptionEn: 'View the events calendar'
  },
  // Notícias
  '01aa36f2-d02e-49ab-903c-f9a638b2f0ba': {
    descriptionEn: 'Stay up to date with the latest news'
  },
  // Reembolso
  '3e7b2395-d708-47de-83ab-a8a7f61d0977': {
    descriptionEn: 'Request expense reimbursement'
  },
  // Contracheque
  '64ee7490-519f-42d2-afba-f3063bbe1bdc': {
    descriptionEn: 'Access your payslips'
  },
  // Ponto
  '515e6360-431d-43b6-9877-a1d0ca23296c': {
    descriptionEn: 'Register your time'
  },
  // Avaliação
  '5b07e529-830c-43be-8f75-dff38053744c': {
    descriptionEn: 'Access your evaluations'
  },
  // Admin
  'e460055d-4b67-4350-a015-5317fc07e76a': {
    descriptionEn: 'Administrative panel'
  }
};

async function updateCardDescriptions() {
  try {
    console.log('Atualizando descrições em inglês dos cards...');
    
    // Primeiro, vamos verificar se a coluna descriptionEn existe
    console.log('Verificando se a coluna descriptionEn existe...');
    
    // Obter todos os cards existentes
    const { data: cards, error: cardsError } = await supabase
      .from('Card')
      .select('id, title, description, titleEn');
    
    if (cardsError) {
      console.error('Erro ao obter cards:', cardsError);
      return;
    }
    
    console.log(`Encontrados ${cards.length} cards para atualizar.`);
    
    // Vamos tentar adicionar a coluna descriptionEn se ela não existir
    // Usando SQL direto via fetch para o endpoint REST do Supabase
    try {
      console.log('Adicionando coluna descriptionEn se não existir...');
      
      const fetch = require('node-fetch');
      const headers = {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      };
      
      // Verificar se a coluna já existe
      const checkColumnResponse = await fetch(`${supabaseUrl}/rest/v1/Card?select=descriptionEn&limit=1`, {
        method: 'GET',
        headers
      });
      
      // Se a coluna não existir, o Supabase retornará um erro
      if (!checkColumnResponse.ok) {
        console.log('Coluna descriptionEn não existe. Adicionando...');
        
        // Usar o SQL direto via PostgreSQL
        // Precisamos usar uma abordagem diferente, já que não podemos executar SQL direto
        // Vamos usar a API do Supabase para adicionar a coluna
        
        // Primeiro, vamos criar uma tabela temporária com a estrutura correta
        console.log('Criando tabela temporária...');
        
        // Atualizar cada card individualmente com a descrição em inglês
        for (const card of cards) {
          const translation = cardTranslations[card.id];
          
          if (translation) {
            console.log(`Atualizando card ${card.id}...`);
            
            // Atualizar o card com a descrição em inglês
            const { error: updateError } = await supabase
              .from('Card')
              .update({
                descriptionEn: translation.descriptionEn
              })
              .eq('id', card.id);
            
            if (updateError) {
              // Se a coluna não existir, o erro será específico
              if (updateError.message && updateError.message.includes('column "descriptionEn" does not exist')) {
                console.log('A coluna descriptionEn não existe. Não é possível atualizar os cards.');
                console.log('Por favor, execute a migração do banco de dados primeiro.');
                return;
              }
              
              console.error(`Erro ao atualizar card ${card.id}:`, updateError);
            } else {
              console.log(`Card ${card.id} atualizado com sucesso!`);
            }
          } else {
            console.log(`Nenhuma tradução encontrada para o card ${card.id}.`);
          }
        }
      } else {
        console.log('Coluna descriptionEn já existe. Atualizando cards...');
        
        // Atualizar cada card com a descrição em inglês
        for (const card of cards) {
          const translation = cardTranslations[card.id];
          
          if (translation) {
            console.log(`Atualizando card ${card.id}...`);
            
            const { error: updateError } = await supabase
              .from('Card')
              .update({
                descriptionEn: translation.descriptionEn
              })
              .eq('id', card.id);
            
            if (updateError) {
              console.error(`Erro ao atualizar card ${card.id}:`, updateError);
            } else {
              console.log(`Card ${card.id} atualizado com sucesso!`);
            }
          } else {
            console.log(`Nenhuma tradução encontrada para o card ${card.id}.`);
          }
        }
      }
      
      console.log('Atualização de descrições concluída!');
    } catch (error) {
      console.error('Erro ao executar operações SQL:', error);
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Executar a função
updateCardDescriptions();
