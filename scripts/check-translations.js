/**
 * Script para verificar e atualizar traduções
 * Este script deve ser executado sempre que novas páginas forem adicionadas
 */

const { ensureAllTranslationsExist } = require('../dist/lib/autoTranslate');

// Executar a verificação de traduções
console.log('Verificando traduções...');
ensureAllTranslationsExist();
