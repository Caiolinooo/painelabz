// Script para verificar configurações do Tailwind CSS
const fs = require('fs');
const path = require('path');

// Função para verificar a existência de um arquivo
function checkFile(filePath, description) {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`${description}: ${exists ? 'EXISTENTE ✅' : 'NÃO ENCONTRADO ❌'} (${fullPath})`);
    
    if (exists) {
      const stat = fs.statSync(fullPath);
      console.log(`  - Tamanho: ${(stat.size / 1024).toFixed(2)} KB`);
      console.log(`  - Última modificação: ${stat.mtime}`);
      
      // Se for um arquivo JavaScript ou CSS, exibir as primeiras linhas
      if (['.js', '.ts', '.css', '.json'].includes(path.extname(filePath))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').slice(0, 5);
        console.log('  - Primeiras linhas:');
        lines.forEach((line, index) => {
          console.log(`    ${index + 1}: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
        });
      }
    }
    
    return exists;
  } catch (error) {
    console.error(`Erro ao verificar ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔍 VERIFICAÇÃO DE CONFIGURAÇÃO DO TAILWIND CSS');
console.log('==============================================');

// Verificar arquivos críticos
checkFile('tailwind.config.ts', 'Arquivo de configuração do Tailwind');
checkFile('postcss.config.mjs', 'Configuração do PostCSS');
checkFile('src/app/globals.css', 'Arquivo CSS global');
checkFile('src/app/layout.tsx', 'Layout principal da aplicação');
checkFile('package.json', 'Dependências do projeto');

// Verificar pastas importantes
const nextDir = path.resolve(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('\nConteúdo da pasta .next:');
  const files = fs.readdirSync(nextDir);
  files.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  // Verificar se o CSS foi gerado
  const builtCss = path.resolve(nextDir, 'static/css');
  if (fs.existsSync(builtCss)) {
    console.log('\nArquivos CSS gerados:');
    const cssFiles = fs.readdirSync(builtCss);
    cssFiles.forEach(file => {
      const filePath = path.resolve(builtCss, file);
      const stat = fs.statSync(filePath);
      console.log(`  - ${file} (${(stat.size / 1024).toFixed(2)} KB)`);
    });
  } else {
    console.log('\nPasta de CSS estático não encontrada ❌');
  }
}

console.log('\n✅ Verificação concluída!'); 