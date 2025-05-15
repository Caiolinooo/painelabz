/**
 * Utilitário para tradução automática de páginas
 * Este arquivo contém funções para ajudar na tradução automática de novas páginas
 */

import fs from 'fs';
import path from 'path';
import { i18n } from '@/i18n/config';

// Função para extrair chaves de tradução de um arquivo
export function extractTranslationKeys(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    const keys = new Set<string>();

    // Regex para encontrar chamadas de t('chave')
    const regex1 = /t\(['"]([^'"]+)['"]\)/g;
    const matches1 = content.matchAll(regex1);

    for (const match of matches1) {
      if (match[1]) {
        keys.add(match[1]);
      }
    }

    // Regex para encontrar chamadas de t(`chave`)
    const regex2 = /t\(`([^`]+)`\)/g;
    const matches2 = content.matchAll(regex2);

    for (const match of matches2) {
      if (match[1]) {
        keys.add(match[1]);
      }
    }

    // Regex para encontrar chamadas de t("chave", "valor padrão")
    const regex3 = /t\(['"]([^'"]+)['"],\s*['"][^'"]*['"]\)/g;
    const matches3 = content.matchAll(regex3);

    for (const match of matches3) {
      if (match[1]) {
        keys.add(match[1]);
      }
    }

    // Regex para encontrar chamadas de tagged template literals: t`chave`
    const regex4 = /t`([^`]+)`/g;
    const matches4 = content.matchAll(regex4);

    for (const match of matches4) {
      if (match[1]) {
        // Remover interpolações ${...} para obter apenas a chave
        const key = match[1].replace(/\${[^}]+}/g, '').trim();
        if (key) {
          keys.add(key);
        }
      }
    }

    return Array.from(keys);
  } catch (error) {
    console.error(`Erro ao extrair chaves de tradução de ${filePath}:`, error);
    return [];
  }
}

// Função para verificar se uma chave já existe nos arquivos de tradução
export function checkTranslationExists(key: string, locale: string): boolean {
  try {
    const translationPath = path.join(process.cwd(), 'src', 'i18n', 'locales', `${locale}.json`);

    if (!fs.existsSync(translationPath)) {
      return false;
    }

    const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));

    // Verificar chaves aninhadas (ex: 'admin.dashboard')
    const parts = key.split('.');
    let current = translations;

    for (const part of parts) {
      if (!current[part]) {
        return false;
      }
      current = current[part];
    }

    return true;
  } catch (error) {
    console.error(`Erro ao verificar tradução para ${key} em ${locale}:`, error);
    return false;
  }
}

// Função para adicionar uma nova chave de tradução
export function addTranslation(key: string, value: string, locale: string): boolean {
  try {
    const translationPath = path.join(process.cwd(), 'src', 'i18n', 'locales', `${locale}.json`);

    if (!fs.existsSync(translationPath)) {
      console.error(`Arquivo de tradução não encontrado: ${translationPath}`);
      return false;
    }

    const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));

    // Adicionar chaves aninhadas (ex: 'admin.dashboard')
    const parts = key.split('.');
    let current = translations;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // Definir o valor da última parte
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;

    // Salvar o arquivo atualizado
    fs.writeFileSync(translationPath, JSON.stringify(translations, null, 2), 'utf8');

    return true;
  } catch (error) {
    console.error(`Erro ao adicionar tradução para ${key} em ${locale}:`, error);
    return false;
  }
}

// Função para processar um diretório e extrair todas as chaves de tradução
export function processDirectory(dirPath: string): string[] {
  try {
    const allKeys = new Set<string>();

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        // Processar subdiretório recursivamente
        const subDirKeys = processDirectory(filePath);
        subDirKeys.forEach(key => allKeys.add(key));
      } else if (stats.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
        // Processar arquivo
        const fileKeys = extractTranslationKeys(filePath);
        fileKeys.forEach(key => allKeys.add(key));
      }
    }

    return Array.from(allKeys);
  } catch (error) {
    console.error(`Erro ao processar diretório ${dirPath}:`, error);
    return [];
  }
}

// Função para garantir que todas as chaves existam em todos os idiomas
export function ensureAllTranslationsExist(): void {
  try {
    // Extrair todas as chaves de tradução do código
    const srcPath = path.join(process.cwd(), 'src');
    const allKeys = processDirectory(srcPath);

    console.log(`Encontradas ${allKeys.length} chaves de tradução no código.`);

    // Verificar se os arquivos de tradução existem para todos os idiomas
    for (const locale of i18n.locales) {
      const translationPath = path.join(process.cwd(), 'src', 'i18n', 'locales', `${locale}.json`);

      if (!fs.existsSync(translationPath)) {
        console.log(`Criando arquivo de tradução para ${locale}...`);
        fs.writeFileSync(translationPath, '{}', 'utf8');
      }
    }

    // Obter o idioma padrão para usar como referência
    const defaultLocale = i18n.defaultLocale || i18n.locales[0];
    console.log(`Usando ${defaultLocale} como idioma de referência.`);

    // Para cada idioma suportado
    for (const locale of i18n.locales) {
      console.log(`Processando traduções para ${locale}...`);
      let addedCount = 0;

      // Verificar se cada chave existe
      for (const key of allKeys) {
        if (!checkTranslationExists(key, locale)) {
          // Se não existir, adicionar com valor padrão
          // Usar o valor no idioma padrão como referência, ou a própria chave se não existir
          let defaultValue = key;

          // Tentar obter o valor do idioma padrão
          if (defaultLocale !== locale && checkTranslationExists(key, defaultLocale)) {
            const defaultTranslationPath = path.join(process.cwd(), 'src', 'i18n', 'locales', `${defaultLocale}.json`);
            const defaultTranslations = JSON.parse(fs.readFileSync(defaultTranslationPath, 'utf8'));

            // Obter o valor no idioma padrão
            const parts = key.split('.');
            let current = defaultTranslations;
            let found = true;

            for (const part of parts) {
              if (!current[part]) {
                found = false;
                break;
              }
              current = current[part];
            }

            if (found && typeof current === 'string') {
              defaultValue = current;
            }
          }

          // Adicionar a tradução com um prefixo para indicar que precisa ser traduzido
          const translationValue = locale === defaultLocale
            ? defaultValue
            : `[${locale}] ${defaultValue}`;

          addTranslation(key, translationValue, locale);
          addedCount++;
        }
      }

      console.log(`Adicionadas ${addedCount} traduções para ${locale}.`);
    }

    console.log('Verificação de traduções concluída!');
  } catch (error) {
    console.error('Erro ao verificar traduções:', error);
  }
}
