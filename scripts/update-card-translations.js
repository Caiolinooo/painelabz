/**
 * Script para atualizar as traduções dos cards existentes no banco de dados
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
    titleEn: 'Manual',
    descriptionEn: 'Access the company manual'
  },
  // Procedimentos
  'c40a97fd-70a5-43f1-af4d-960efabd340b': {
    titleEn: 'Procedures',
    descriptionEn: 'Check company procedures'
  },
  // Políticas
  '2285fcbd-7024-4f9a-91c3-e0a87de27ba0': {
    titleEn: 'Policies',
    descriptionEn: 'Check company policies'
  },
  // Calendário
  '90e09b57-c23e-4149-9770-e35c2d66cf7a': {
    titleEn: 'Calendar',
    descriptionEn: 'View the events calendar'
  },
  // Notícias
  '01aa36f2-d02e-49ab-903c-f9a638b2f0ba': {
    titleEn: 'News',
    descriptionEn: 'Stay up to date with the latest news'
  },
  // Reembolso
  '3e7b2395-d708-47de-83ab-a8a7f61d0977': {
    titleEn: 'Reimbursement',
    descriptionEn: 'Request expense reimbursement'
  },
  // Contracheque
  '64ee7490-519f-42d2-afba-f3063bbe1bdc': {
    titleEn: 'Payslip',
    descriptionEn: 'Access your payslips'
  },
  // Ponto
  '515e6360-431d-43b6-9877-a1d0ca23296c': {
    titleEn: 'Time Clock',
    descriptionEn: 'Register your time'
  },
  // Avaliação
  '5b07e529-830c-43be-8f75-dff38053744c': {
    titleEn: 'Evaluation',
    descriptionEn: 'Access your evaluations'
  },
  // Admin
  'e460055d-4b67-4350-a015-5317fc07e76a': {
    titleEn: 'Admin',
    descriptionEn: 'Administrative panel'
  }
};

async function updateCardTranslations() {
  try {
    console.log('Atualizando traduções dos cards...');

    // Obter todos os cards existentes
    const { data: cards, error: cardsError } = await supabase
      .from('Card')
      .select('id, title, description, titleEn');

    if (cardsError) {
      console.error('Erro ao obter cards:', cardsError);
      return;
    }

    console.log(`Encontrados ${cards.length} cards para atualizar.`);

    // Atualizar cada card com as traduções
    for (const card of cards) {
      const translation = cardTranslations[card.id];

      if (translation) {
        console.log(`Atualizando card ${card.id}...`);

        const { error: updateError } = await supabase
          .from('Card')
          .update({
            titleEn: translation.titleEn
            // Não atualizar descriptionEn ainda, pois a coluna não existe
            // descriptionEn: translation.descriptionEn
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

    console.log('Atualização de traduções concluída!');
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Executar a função
updateCardTranslations();
