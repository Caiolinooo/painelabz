/**
 * Script para corrigir problemas de tradução e sincronizar MenuItem
 * 
 * Ações:
 * 1. Verificar e corrigir traduções dos cards
 * 2. Sincronizar MenuItem com Card (excluindo Dashboard)
 * 3. Verificar se há cards com traduções faltando
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = ***REMOVED***;
const supabaseServiceKey = ***REMOVED*** || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseServiceKey);

async function fixTranslationsAndSync() {
  console.log('🔧 Iniciando correção de traduções e sincronização...\n');

  try {
    // 1. Buscar todos os cards
    console.log('📊 Buscando cards...');
    const { data: cards, error: fetchError } = await supabase
      .from('Card')
      .select('*')
      .order('order');
    
    if (fetchError) throw fetchError;
    console.log(`✅ ${cards.length} cards encontrados\n`);

    // 2. Verificar traduções faltando
    console.log('🔍 Verificando traduções...');
    const cardsWithMissingTranslations = cards.filter(card => 
      !card.titleEn || !card.descriptionEn
    );

    if (cardsWithMissingTranslations.length > 0) {
      console.log(`⚠️  ${cardsWithMissingTranslations.length} cards com traduções faltando:`);
      cardsWithMissingTranslations.forEach(card => {
        console.log(`  - ${card.id}: titleEn=${!!card.titleEn}, descriptionEn=${!!card.descriptionEn}`);
      });
      console.log('');
    } else {
      console.log('✅ Todos os cards têm traduções completas\n');
    }

    // 3. Verificar se Dashboard está desabilitado
    const dashboardCard = cards.find(c => c.id === 'dashboard');
    if (dashboardCard) {
      console.log(`📊 Card Dashboard: enabled=${dashboardCard.enabled}`);
      if (dashboardCard.enabled) {
        console.log('⚠️  Dashboard ainda está habilitado, desabilitando...');
        const { error } = await supabase
          .from('Card')
          .update({ enabled: false, updatedAt: new Date().toISOString() })
          .eq('id', 'dashboard');
        
        if (error) {
          console.error('❌ Erro ao desabilitar Dashboard:', error.message);
        } else {
          console.log('✅ Dashboard desabilitado\n');
        }
      } else {
        console.log('✅ Dashboard já está desabilitado\n');
      }
    }

    // 4. Sincronizar MenuItem (excluindo Dashboard)
    console.log('🔄 Sincronizando MenuItem...');
    
    // Buscar cards habilitados (excluindo Dashboard)
    const { data: enabledCards, error: enabledError } = await supabase
      .from('Card')
      .select('*')
      .eq('enabled', true)
      .neq('id', 'dashboard')
      .order('order');
    
    if (enabledError) throw enabledError;

    console.log(`📋 ${enabledCards.length} cards habilitados (excluindo Dashboard)`);

    // Limpar MenuItem
    await supabase
      .from('MenuItem')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserir cards como menu items
    const menuItems = enabledCards.map(card => ({
      id: card.id,
      href: card.href,
      label: card.title,
      icon: card.iconName || card.icon || 'FiCircle',
      external: card.external,
      enabled: card.enabled,
      order: card.order,
      adminOnly: card.adminOnly,
      managerOnly: card.managerOnly,
      allowedRoles: card.allowedRoles,
      allowedUserIds: card.allowedUserIds,
      title_pt: card.title,
      title_en: card.titleEn,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const { error: menuError } = await supabase
      .from('MenuItem')
      .insert(menuItems);
    
    if (menuError) {
      console.error('❌ Erro ao sincronizar MenuItem:', menuError.message);
    } else {
      console.log(`✅ ${menuItems.length} itens sincronizados em MenuItem\n`);
    }

    // 5. Relatório final
    console.log('📊 Relatório Final:');
    console.log('─'.repeat(50));
    console.log(`Total de Cards: ${cards.length}`);
    console.log(`Cards Habilitados: ${enabledCards.length}`);
    console.log(`Cards no MenuItem: ${menuItems.length}`);
    console.log(`Dashboard: ${dashboardCard?.enabled ? 'Habilitado ⚠️' : 'Desabilitado ✅'}`);
    console.log('─'.repeat(50));

    // 6. Listar cards habilitados
    console.log('\n📋 Cards Habilitados (ordem de exibição):');
    enabledCards.forEach((card, index) => {
      const status = [];
      if (card.adminOnly) status.push('Admin');
      if (card.managerOnly) status.push('Gerente');
      const statusStr = status.length > 0 ? ` [${status.join(', ')}]` : '';
      
      console.log(`  ${index + 1}. ${card.title}${statusStr}`);
      console.log(`     EN: ${card.titleEn || '❌ Faltando'}`);
    });

    console.log('\n✅ Correções e sincronização concluídas!');

  } catch (error) {
    console.error('❌ Erro durante execução:', error);
    process.exit(1);
  }
}

fixTranslationsAndSync();

