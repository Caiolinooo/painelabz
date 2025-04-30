/**
 * Script para verificar e atualizar traduções
 * Este script deve ser executado sempre que novas páginas forem adicionadas
 *
 * Uso:
 * - Compilar o projeto: npm run build
 * - Executar o script: node scripts/check-translations.js
 */

const path = require('path');
const fs = require('fs');

// Verificar se o diretório dist existe
if (!fs.existsSync(path.join(__dirname, '../dist'))) {
  console.error('Erro: O diretório dist não existe. Execute "npm run build" primeiro.');
  process.exit(1);
}

// Verificar se o arquivo autoTranslate existe
if (!fs.existsSync(path.join(__dirname, '../dist/lib/autoTranslate.js'))) {
  console.error('Erro: O arquivo autoTranslate.js não foi compilado. Execute "npm run build" primeiro.');
  process.exit(1);
}

// Importar a função de verificação de traduções
const { ensureAllTranslationsExist } = require('../dist/lib/autoTranslate');

// Executar a verificação de traduções
console.log('Iniciando verificação de traduções...');
console.log('Este processo pode levar alguns minutos dependendo do tamanho do projeto.');
console.log('-------------------------------------------------------------');

try {
  ensureAllTranslationsExist();
  console.log('-------------------------------------------------------------');
  console.log('Verificação de traduções concluída com sucesso!');
  console.log('As traduções foram atualizadas em src/i18n/locales/');
} catch (error) {
  console.error('Erro ao verificar traduções:', error);
  process.exit(1);
}
