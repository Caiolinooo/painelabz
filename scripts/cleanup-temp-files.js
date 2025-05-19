/**
 * Script para limpar arquivos temporários
 * Este script remove arquivos temporários antigos
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Diretórios a serem limpos
const DIRS_TO_CLEAN = [
  'temp-files',
  'debug'
];

// Idade máxima dos arquivos em horas
const MAX_AGE_HOURS = process.argv[2] ? parseInt(process.argv[2]) : 24;

/**
 * Limpa arquivos antigos de um diretório
 * @param {string} dirPath Caminho do diretório
 * @param {number} maxAgeHours Idade máxima dos arquivos em horas
 * @returns {number} Número de arquivos removidos
 */
function cleanupDirectory(dirPath, maxAgeHours) {
  try {
    // Verificar se o diretório existe
    if (!fs.existsSync(dirPath)) {
      console.log(`Diretório ${dirPath} não existe, ignorando...`);
      return 0;
    }
    
    const now = new Date();
    const files = fs.readdirSync(dirPath);
    let removedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      
      // Ignorar diretórios
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }
      
      const stats = fs.statSync(filePath);
      
      // Verificar se o arquivo é mais antigo que maxAgeHours
      const fileAge = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60);
      if (fileAge > maxAgeHours) {
        fs.unlinkSync(filePath);
        removedCount++;
        console.log(`Removido: ${filePath} (${fileAge.toFixed(2)} horas)`);
      }
    }
    
    return removedCount;
  } catch (error) {
    console.error(`Erro ao limpar diretório ${dirPath}:`, error);
    return 0;
  }
}

/**
 * Função principal
 */
function main() {
  console.log(`=== Limpeza de Arquivos Temporários (${MAX_AGE_HOURS} horas) ===`);
  
  let totalRemoved = 0;
  
  for (const dir of DIRS_TO_CLEAN) {
    const dirPath = path.join(process.cwd(), dir);
    console.log(`Limpando diretório: ${dirPath}`);
    
    const removedCount = cleanupDirectory(dirPath, MAX_AGE_HOURS);
    totalRemoved += removedCount;
    
    console.log(`${removedCount} arquivos removidos de ${dir}`);
  }
  
  console.log(`Total: ${totalRemoved} arquivos removidos`);
}

// Executar a função principal
main();
