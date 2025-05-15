/**
 * Script para atualizar as descrições em inglês dos cards existentes no banco de dados
 */

// Carregar variáveis de ambiente
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    
    // Obter todos os cards existentes
    const cards = await prisma.card.findMany();
    
    console.log(`Encontrados ${cards.length} cards para atualizar.`);
    
    // Atualizar cada card com as traduções
    for (const card of cards) {
      const translation = cardTranslations[card.id];
      
      if (translation) {
        console.log(`Atualizando card ${card.id}...`);
        
        try {
          await prisma.card.update({
            where: { id: card.id },
            data: {
              descriptionEn: translation.descriptionEn
            }
          });
          
          console.log(`Card ${card.id} atualizado com sucesso!`);
        } catch (error) {
          console.error(`Erro ao atualizar card ${card.id}:`, error);
        }
      } else {
        console.log(`Nenhuma tradução encontrada para o card ${card.id}.`);
      }
    }
    
    console.log('Atualização de descrições concluída!');
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função
updateCardDescriptions();
