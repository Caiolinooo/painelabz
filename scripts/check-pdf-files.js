// Script para verificar se os arquivos PDF existem e são acessíveis
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Função para verificar se um arquivo é um PDF
function isPdf(filePath) {
  return path.extname(filePath).toLowerCase() === '.pdf';
}

// Função para verificar um diretório recursivamente
async function checkDirectory(dir) {
  try {
    console.log(`\nVerificando diretório: ${dir}`);
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        // Verificar subdiretório
        await checkDirectory(filePath);
      } else if (isPdf(filePath)) {
        // Verificar arquivo PDF
        const fileSize = (stats.size / 1024).toFixed(2);
        console.log(`✓ ${filePath} (${fileSize} KB)`);
      }
    }
  } catch (error) {
    console.error(`Erro ao verificar diretório ${dir}:`, error.message);
  }
}

// Função principal
async function main() {
  console.log('Verificando arquivos PDF...');
  
  // Verificar diretório de documentos
  const docsDir = path.join(__dirname, '..', 'public', 'documentos');
  
  try {
    // Verificar se o diretório existe
    await stat(docsDir);
    
    // Verificar estrutura de diretórios
    console.log('\nEstrutura de diretórios:');
    const dirs = await readdir(docsDir);
    
    for (const dir of dirs) {
      const dirPath = path.join(docsDir, dir);
      const stats = await stat(dirPath);
      
      if (stats.isDirectory()) {
        console.log(`- ${dir}/`);
      }
    }
    
    // Verificar arquivos PDF
    await checkDirectory(docsDir);
    
    console.log('\nVerificação concluída!');
  } catch (error) {
    console.error('Erro ao verificar diretório de documentos:', error.message);
  }
}

// Executar função principal
main().catch(error => {
  console.error('Erro:', error);
  process.exit(1);
});
