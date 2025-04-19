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
    
    // Regex para encontrar chamadas de t('chave')
    const regex = /t\(['"]([^'"]+)['"]\)/g;
    const matches = content.matchAll(regex);
    
    const keys = new Set<string>();
    for (const match of matches) {
      if (match[1]) {
        keys.add(match[1]);
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
    
    // Para cada idioma suportado
    for (const locale of i18n.locales) {
      // Verificar se cada chave existe
      for (const key of allKeys) {
        if (!checkTranslationExists(key, locale)) {
          // Se não existir, adicionar com valor padrão
          // Usar o valor em inglês como padrão, ou a própria chave se não existir
          let defaultValue = key;
          
          if (checkTranslationExists(key, 'en')) {
            const enTranslationPath = path.join(process.cwd(), 'src', 'i18n', 'locales', 'en.json');
            const enTranslations = JSON.parse(fs.readFileSync(enTranslationPath, 'utf8'));
            
            // Obter o valor em inglês
            const parts = key.split('.');
            let current = enTranslations;
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
          
          // Adicionar a tradução
          addTranslation(key, `[${locale}] ${defaultValue}`, locale);
          console.log(`Adicionada tradução para ${key} em ${locale}`);
        }
      }
    }
    
    console.log('Verificação de traduções concluída!');
  } catch (error) {
    console.error('Erro ao verificar traduções:', error);
  }
}
