/**
 * Script para verificar dependências do PostgreSQL
 * Este script verifica se há alguma dependência do PostgreSQL no projeto
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Palavras-chave para procurar
const keywords = [
  'postgresql',
  'postgres',
  'pg ',
  'pgclient',
  'pg-promise',
  'sequelize',
  'DATABASE_URL'
];

// Diretórios para ignorar
const ignoreDirs = [
  'node_modules',
  '.next',
  '.git',
  'public'
];

// Extensões de arquivo para verificar
const fileExtensions = [
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.prisma'
];

// Função para verificar um arquivo
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];

    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        matches.push(keyword);
      }
    });

    if (matches.length > 0) {
      console.log(`\x1b[33m[ENCONTRADO]\x1b[0m ${filePath}`);
      console.log(`  Palavras-chave encontradas: ${matches.join(', ')}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`\x1b[31m[ERRO]\x1b[0m Não foi possível ler o arquivo ${filePath}:`, error.message);
    return false;
  }
}

// Função para verificar um diretório recursivamente
function checkDirectory(dir) {
  let found = false;
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      // Ignorar diretórios específicos
      if (stat.isDirectory()) {
        if (!ignoreDirs.includes(file)) {
          const foundInSubdir = checkDirectory(filePath);
          found = found || foundInSubdir;
        }
      } else {
        // Verificar apenas arquivos com extensões específicas
        const ext = path.extname(file);
        if (fileExtensions.includes(ext)) {
          const foundInFile = checkFile(filePath);
          found = found || foundInFile;
        }
      }
    }
  } catch (error) {
    console.error(`\x1b[31m[ERRO]\x1b[0m Não foi possível ler o diretório ${dir}:`, error.message);
  }
  return found;
}

// Verificar dependências no package.json
function checkPackageJson() {
  try {
    const packageJson = require('../package.json');
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const postgresRelatedDeps = Object.keys(dependencies).filter(dep => 
      dep.includes('pg') || 
      dep.includes('postgres') || 
      dep.includes('sequelize')
    );
    
    if (postgresRelatedDeps.length > 0) {
      console.log('\x1b[33m[ENCONTRADO]\x1b[0m Dependências relacionadas ao PostgreSQL no package.json:');
      postgresRelatedDeps.forEach(dep => {
        console.log(`  - ${dep}: ${dependencies[dep]}`);
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('\x1b[31m[ERRO]\x1b[0m Não foi possível ler o package.json:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('\x1b[36m=== Verificando dependências do PostgreSQL ===\x1b[0m');
  
  console.log('\n\x1b[36m=== Verificando package.json ===\x1b[0m');
  const foundInPackageJson = checkPackageJson();
  
  console.log('\n\x1b[36m=== Verificando arquivos do projeto ===\x1b[0m');
  const foundInFiles = checkDirectory(path.resolve(__dirname, '..'));
  
  if (!foundInPackageJson && !foundInFiles) {
    console.log('\n\x1b[32m[SUCESSO]\x1b[0m Nenhuma dependência do PostgreSQL encontrada no projeto!');
  } else {
    console.log('\n\x1b[33m[ATENÇÃO]\x1b[0m Foram encontradas possíveis dependências do PostgreSQL.');
    console.log('Revise os arquivos listados acima e remova as dependências desnecessárias.');
  }
}

// Executar a função principal
main().catch(error => {
  console.error('\x1b[31m[ERRO]\x1b[0m Ocorreu um erro durante a verificação:', error);
});
