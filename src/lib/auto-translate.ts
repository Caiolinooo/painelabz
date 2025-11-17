/**
 * Sistema Automático de Detecção e Tradução de Textos Faltantes
 * 
 * Este módulo detecta textos hardcoded em português e gera automaticamente
 * as traduções para inglês usando uma API de tradução ou regras predefinidas.
 */

import fs from 'fs';
import path from 'path';

interface MissingTranslation {
  key: string;
  ptText: string;
  enText: string;
  file: string;
  line: number;
}

// Padrões para detectar textos hardcoded em português
const PORTUGUESE_PATTERNS = [
  /['"]([^'"]*[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ][^'"]*)['"]/g, // Textos com acentos
  /['"]([^'"]*(?:ção|ões|ção|ões|ário|ária)[^'"]*)['"]/g, // Terminações portuguesas
];

// Dicionário de traduções comuns
const COMMON_TRANSLATIONS: Record<string, string> = {
  // Ações
  'Salvar': 'Save',
  'Cancelar': 'Cancel',
  'Excluir': 'Delete',
  'Editar': 'Edit',
  'Visualizar': 'View',
  'Buscar': 'Search',
  'Filtrar': 'Filter',
  'Fechar': 'Close',
  'Confirmar': 'Confirm',
  'Voltar': 'Back',
  'Próximo': 'Next',
  'Anterior': 'Previous',
  'Enviar': 'Submit',
  'Ajuda': 'Help',
  
  // Status
  'Pendente': 'Pending',
  'Aprovado': 'Approved',
  'Rejeitado': 'Rejected',
  'Concluído': 'Completed',
  'Em Andamento': 'In Progress',
  
  // Mensagens
  'Carregando...': 'Loading...',
  'Erro': 'Error',
  'Sucesso': 'Success',
  'Aviso': 'Warning',
  'Informação': 'Information',
  
  // Comum
  'Sim': 'Yes',
  'Não': 'No',
  'Todos': 'All',
  'Nenhum': 'None',
  'Selecione': 'Select',
  'Obrigatório': 'Required',
  'Opcional': 'Optional',
};

/**
 * Traduz um texto do português para o inglês
 */
function translateText(ptText: string): string {
  // Verificar dicionário de traduções comuns
  if (COMMON_TRANSLATIONS[ptText]) {
    return COMMON_TRANSLATIONS[ptText];
  }
  
  // Regras de tradução simples
  let enText = ptText;
  
  // Remover acentos
  enText = enText
    .replace(/[áàâã]/g, 'a')
    .replace(/[éê]/g, 'e')
    .replace(/[í]/g, 'i')
    .replace(/[óôõ]/g, 'o')
    .replace(/[ú]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ÁÀÂÃ]/g, 'A')
    .replace(/[ÉÊ]/g, 'E')
    .replace(/[Í]/g, 'I')
    .replace(/[ÓÔÕ]/g, 'O')
    .replace(/[Ú]/g, 'U')
    .replace(/[Ç]/g, 'C');
  
  // Substituições comuns
  enText = enText
    .replace(/ção$/, 'tion')
    .replace(/ções$/, 'tions')
    .replace(/ário$/, 'ary')
    .replace(/ária$/, 'ary');
  
  return enText;
}

/**
 * Gera uma chave de tradução a partir do texto
 */
function generateKey(text: string, context: string = ''): string {
  let key = text
    .toLowerCase()
    .replace(/[áàâã]/g, 'a')
    .replace(/[éê]/g, 'e')
    .replace(/[í]/g, 'i')
    .replace(/[óôõ]/g, 'o')
    .replace(/[ú]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  if (context) {
    key = `${context}_${key}`;
  }
  
  return key;
}

/**
 * Escaneia um arquivo em busca de textos hardcoded
 */
function scanFile(filePath: string): MissingTranslation[] {
  const missing: MissingTranslation[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      PORTUGUESE_PATTERNS.forEach(pattern => {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          const ptText = match[1];
          
          // Ignorar se já está usando t()
          if (line.includes(`t('`) || line.includes('t("')) {
            continue;
          }
          
          // Ignorar imports e comentários
          if (line.trim().startsWith('import') || line.trim().startsWith('//') || line.trim().startsWith('*')) {
            continue;
          }
          
          const key = generateKey(ptText);
          const enText = translateText(ptText);
          
          missing.push({
            key,
            ptText,
            enText,
            file: filePath,
            line: index + 1
          });
        }
      });
    });
  } catch (error) {
    console.error(`Erro ao escanear arquivo ${filePath}:`, error);
  }
  
  return missing;
}

/**
 * Escaneia um diretório recursivamente
 */
function scanDirectory(dirPath: string, extensions: string[] = ['.tsx', '.ts', '.jsx', '.js']): MissingTranslation[] {
  let missing: MissingTranslation[] = [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      // Ignorar node_modules e .next
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
        continue;
      }
      
      if (entry.isDirectory()) {
        missing = missing.concat(scanDirectory(fullPath, extensions));
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        missing = missing.concat(scanFile(fullPath));
      }
    }
  } catch (error) {
    console.error(`Erro ao escanear diretório ${dirPath}:`, error);
  }
  
  return missing;
}

/**
 * Adiciona traduções faltantes aos arquivos de idioma
 */
export function addMissingTranslations(missing: MissingTranslation[], localesPath: string) {
  // Agrupar por contexto (primeira parte da chave)
  const grouped: Record<string, MissingTranslation[]> = {};
  
  missing.forEach(item => {
    const context = item.key.split('_')[0] || 'common';
    if (!grouped[context]) {
      grouped[context] = [];
    }
    grouped[context].push(item);
  });
  
  // Gerar código para adicionar às traduções
  const ptAdditions: string[] = [];
  const enAdditions: string[] = [];
  
  Object.entries(grouped).forEach(([context, items]) => {
    ptAdditions.push(`  // Auto-gerado - ${context}`);
    enAdditions.push(`  // Auto-generated - ${context}`);
    
    items.forEach(item => {
      ptAdditions.push(`  ${item.key}: '${item.ptText}',`);
      enAdditions.push(`  ${item.key}: '${item.enText}',`);
    });
    
    ptAdditions.push('');
    enAdditions.push('');
  });
  
  return {
    ptAdditions: ptAdditions.join('\n'),
    enAdditions: enAdditions.join('\n'),
    grouped
  };
}

/**
 * Função principal para detectar e gerar traduções
 */
export async function detectAndGenerateTranslations(projectPath: string) {
  console.log('🔍 Escaneando projeto em busca de textos hardcoded...');
  
  const srcPath = path.join(projectPath, 'src');
  const missing = scanDirectory(srcPath);
  
  console.log(`📊 Encontrados ${missing.length} textos potencialmente não traduzidos`);
  
  if (missing.length === 0) {
    return {
      success: true,
      message: 'Nenhum texto hardcoded encontrado!',
      missing: []
    };
  }
  
  // Remover duplicatas
  const unique = missing.filter((item, index, self) =>
    index === self.findIndex(t => t.key === item.key && t.ptText === item.ptText)
  );
  
  console.log(`✨ ${unique.length} textos únicos após remoção de duplicatas`);
  
  const localesPath = path.join(srcPath, 'i18n', 'locales');
  const result = addMissingTranslations(unique, localesPath);
  
  return {
    success: true,
    message: `Encontrados ${unique.length} textos para traduzir`,
    missing: unique,
    additions: result
  };
}
