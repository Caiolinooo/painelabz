/**
 * Script para obter os cards existentes no banco de dados
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

async function getCards() {
  try {
    console.log('Obtendo cards do banco de dados...');
    
    const { data: cards, error } = await supabase
      .from('Card')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) {
      console.error('Erro ao obter cards:', error);
      return;
    }
    
    console.log(`Encontrados ${cards.length} cards:`);
    
    // Exibir informações dos cards
    cards.forEach((card, index) => {
      console.log(`\nCard ${index + 1}:`);
      console.log(`ID: ${card.id}`);
      console.log(`Título (PT): ${card.title}`);
      console.log(`Descrição (PT): ${card.description}`);
      console.log(`Título (EN): ${card.titleEn || 'Não definido'}`);
      console.log(`Descrição (EN): ${card.descriptionEn || 'Não definido'}`);
      console.log(`Ícone: ${card.icon}`);
      console.log(`Link: ${card.href}`);
      console.log(`Ordem: ${card.order}`);
      console.log(`Habilitado: ${card.enabled ? 'Sim' : 'Não'}`);
    });
    
    // Gerar código para adicionar traduções
    console.log('\n\nCódigo para adicionar traduções:');
    
    // Português
    console.log('\n// Português (pt-BR.ts)');
    console.log('cards: {');
    cards.forEach(card => {
      const cardId = card.id.replace(/-/g, '');
      console.log(`  ${cardId}: '${card.title}',`);
      console.log(`  ${cardId}Desc: '${card.description}',`);
    });
    console.log('},');
    
    // Inglês
    console.log('\n// Inglês (en-US.ts)');
    console.log('cards: {');
    cards.forEach(card => {
      const cardId = card.id.replace(/-/g, '');
      const titleEn = card.titleEn || card.title;
      const descriptionEn = card.descriptionEn || card.description;
      console.log(`  ${cardId}: '${titleEn}',`);
      console.log(`  ${cardId}Desc: '${descriptionEn}',`);
    });
    console.log('},');
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Executar a função
getCards();
