/**
 * Script para substituir todas as ocorrências de 'abzToken' por 'token' em todos os arquivos
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Extensões de arquivos a serem processados
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Função para verificar se um arquivo deve ser processado
const shouldProcessFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return extensions.includes(ext);
};

// Função para processar um arquivo
async function processFile(filePath) {
  try {
    // Ler o conteúdo do arquivo
    const content = await readFile(filePath, 'utf8');
    
    // Verificar se o arquivo contém 'abzToken'
    if (!content.includes('abzToken')) {
      return { path: filePath, changed: false };
    }
    
    // Substituir todas as ocorrências
    const newContent = content
      // Substituir localStorage.getItem('token') || localStorage.getItem('abzToken')
      .replace(/localStorage\.getItem\(['"]abzToken['"]\)/g, "localStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('abzToken')")
      // Substituir localStorage.setItem('token', ...)
      .replace(/localStorage\.setItem\(['"]abzToken['"], (.*?)\)/g, "localStorage.setItem('token', $1)")
      // Substituir localStorage.removeItem('abzToken'); localStorage.removeItem('token')
      .replace(/localStorage\.removeItem\(['"]abzToken['"]\)/g, "localStorage.removeItem('abzToken'); localStorage.removeItem('token'); localStorage.removeItem('token')")
      // Substituir referências a .token
      .replace(/\.token/g, '.token');
    
    // Escrever o conteúdo atualizado no arquivo
    await writeFile(filePath, newContent, 'utf8');
    
    return { path: filePath, changed: true };
  } catch (error) {
    console.error(`Erro ao processar arquivo ${filePath}:`, error);
    return { path: filePath, changed: false, error: error.message };
  }
}

// Função para percorrer diretórios recursivamente
async function processDirectory(dirPath) {
  const results = [];
  
  try {
    const entries = await readdir(dirPath);
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      const entryStat = await stat(entryPath);
      
      if (entryStat.isDirectory()) {
        // Ignorar node_modules e .next
        if (entry !== 'node_modules' && entry !== '.next' && entry !== '.git') {
          const subResults = await processDirectory(entryPath);
          results.push(...subResults);
        }
      } else if (entryStat.isFile() && shouldProcessFile(entryPath)) {
        const result = await processFile(entryPath);
        results.push(result);
      }
    }
  } catch (error) {
    console.error(`Erro ao processar diretório ${dirPath}:`, error);
  }
  
  return results;
}

// Função principal
async function main() {
  console.log('Iniciando substituição de "abzToken" por "token"...');
  
  // Processar diretório src
  const srcResults = await processDirectory('src');
  
  // Processar diretório scripts
  const scriptsResults = await processDirectory('scripts');
  
  // Combinar resultados
  const results = [...srcResults, ...scriptsResults];
  
  // Filtrar arquivos alterados
  const changedFiles = results.filter(result => result.changed);
  
  console.log(`\nProcessamento concluído!`);
  console.log(`Total de arquivos processados: ${results.length}`);
  console.log(`Arquivos alterados: ${changedFiles.length}`);
  
  if (changedFiles.length > 0) {
    console.log('\nArquivos alterados:');
    changedFiles.forEach(file => {
      console.log(`- ${file.path}`);
    });
  }
  
  // Verificar se houve erros
  const filesWithErrors = results.filter(result => result.error);
  
  if (filesWithErrors.length > 0) {
    console.log('\nErros encontrados:');
    filesWithErrors.forEach(file => {
      console.log(`- ${file.path}: ${file.error}`);
    });
  }
}

// Executar a função principal
main().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
});
