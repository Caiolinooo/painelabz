/**
 * Script para verificar traduções ausentes
 * Este script compara os arquivos de tradução e identifica chaves que estão em um idioma mas não em outro
 * 
 * Uso:
 * - Executar o script: node scripts/check-missing-translations.js
 */

const fs = require('fs');
const path = require('path');

// Configuração
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const PRIMARY_LOCALE = 'pt-BR.ts';
const SECONDARY_LOCALE = 'en-US.ts';

// Função para extrair as chaves de tradução de um objeto
function extractKeys(obj, prefix = '') {
  let keys = [];
  
  for (const key in obj) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursivamente extrair chaves de objetos aninhados
      keys = [...keys, ...extractKeys(obj[key], newPrefix)];
    } else {
      // Adicionar a chave completa
      keys.push(newPrefix);
    }
  }
  
  return keys;
}

// Função para verificar se uma chave existe em um objeto
function keyExists(obj, key) {
  const parts = key.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  
  return true;
}

// Função para obter o valor de uma chave em um objeto
function getValue(obj, key) {
  const parts = key.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

// Função principal
async function checkMissingTranslations() {
  console.log('Verificando traduções ausentes...');
  
  try {
    // Carregar os arquivos de tradução
    const primaryLocaleFile = path.join(LOCALES_DIR, PRIMARY_LOCALE);
    const secondaryLocaleFile = path.join(LOCALES_DIR, SECONDARY_LOCALE);
    
    if (!fs.existsSync(primaryLocaleFile) || !fs.existsSync(secondaryLocaleFile)) {
      console.error('Arquivos de tradução não encontrados!');
      return;
    }
    
    // Ler o conteúdo dos arquivos
    const primaryContent = fs.readFileSync(primaryLocaleFile, 'utf8');
    const secondaryContent = fs.readFileSync(secondaryLocaleFile, 'utf8');
    
    // Extrair o objeto de tradução (remover 'export default' e converter para objeto)
    const primaryMatch = primaryContent.match(/export\s+default\s+(\{[\s\S]*\})/);
    const secondaryMatch = secondaryContent.match(/export\s+default\s+(\{[\s\S]*\})/);
    
    if (!primaryMatch || !secondaryMatch) {
      console.error('Formato de arquivo de tradução inválido!');
      return;
    }
    
    // Avaliar os objetos de tradução
    const primaryObj = eval(`(${primaryMatch[1]})`);
    const secondaryObj = eval(`(${secondaryMatch[1]})`);
    
    // Extrair todas as chaves
    const primaryKeys = extractKeys(primaryObj);
    const secondaryKeys = extractKeys(secondaryObj);
    
    // Encontrar chaves ausentes em cada idioma
    const missingInSecondary = primaryKeys.filter(key => !keyExists(secondaryObj, key));
    const missingInPrimary = secondaryKeys.filter(key => !keyExists(primaryObj, key));
    
    // Exibir resultados
    console.log(`\nTotal de chaves em ${PRIMARY_LOCALE}: ${primaryKeys.length}`);
    console.log(`Total de chaves em ${SECONDARY_LOCALE}: ${secondaryKeys.length}`);
    
    console.log(`\nChaves ausentes em ${SECONDARY_LOCALE}: ${missingInSecondary.length}`);
    if (missingInSecondary.length > 0) {
      console.log('Chaves:');
      missingInSecondary.forEach(key => {
        const value = getValue(primaryObj, key);
        console.log(`  ${key}: "${value}"`);
      });
    }
    
    console.log(`\nChaves ausentes em ${PRIMARY_LOCALE}: ${missingInPrimary.length}`);
    if (missingInPrimary.length > 0) {
      console.log('Chaves:');
      missingInPrimary.forEach(key => {
        const value = getValue(secondaryObj, key);
        console.log(`  ${key}: "${value}"`);
      });
    }
    
    // Verificar chaves específicas para os cards
    console.log('\nVerificando traduções dos cards...');
    const cardKeys = primaryKeys.filter(key => key.startsWith('cards.'));
    const cardKeysSecondary = secondaryKeys.filter(key => key.startsWith('cards.'));
    
    console.log(`Total de chaves de cards em ${PRIMARY_LOCALE}: ${cardKeys.length}`);
    console.log(`Total de chaves de cards em ${SECONDARY_LOCALE}: ${cardKeysSecondary.length}`);
    
    const missingCardKeys = cardKeys.filter(key => !keyExists(secondaryObj, key));
    if (missingCardKeys.length > 0) {
      console.log(`\nChaves de cards ausentes em ${SECONDARY_LOCALE}:`);
      missingCardKeys.forEach(key => {
        const value = getValue(primaryObj, key);
        console.log(`  ${key}: "${value}"`);
      });
    }
    
    console.log('\nVerificação concluída!');
  } catch (error) {
    console.error('Erro ao verificar traduções:', error);
  }
}

// Executar a função principal
checkMissingTranslations();
