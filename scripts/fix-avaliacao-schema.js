/**
 * Script para corrigir o esquema do banco de dados para o módulo de avaliação
 * usando o Supabase CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Função para executar comandos do Supabase CLI
function runSupabaseCommand(command) {
  try {
    console.log(`Executando: npx supabase ${command}`);
    const output = execSync(`npx supabase ${command}`, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Erro ao executar comando: npx supabase ${command}`);
    console.error(error.message);
    return null;
  }
}

// Função principal
async function fixAvaliacaoSchema() {
  try {
    console.log('Iniciando correção do esquema do banco de dados...');
    
    // Verificar se o Supabase CLI está instalado
    try {
      execSync('npx supabase --version', { encoding: 'utf8' });
    } catch (error) {
      console.error('Supabase CLI não encontrado. Instalando...');
      execSync('npm install -g supabase', { encoding: 'utf8' });
    }
    
    // Criar diretório de migrações se não existir
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('Criando diretório de migrações...');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    // Criar arquivo de migração
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const migrationFile = path.join(migrationsDir, `${timestamp}_fix_avaliacoes.sql`);
    
    console.log(`Criando arquivo de migração: ${migrationFile}`);
    fs.copyFileSync(
      path.join(__dirname, 'fix-avaliacao-database-complete.sql'),
      migrationFile
    );
    
    // Executar migração
    console.log('Executando migração...');
    
    // Verificar se o projeto está configurado
    const projectId = process.env.SUPABASE_PROJECT_ID || 'arzvingdtnttiejcvucs';
    
    // Aplicar migração
    runSupabaseCommand(`db push --db-url postgresql://postgres:postgres@localhost:5432/postgres`);
    
    console.log('Migração concluída com sucesso!');
    
    // Gerar tipos TypeScript
    console.log('Gerando tipos TypeScript...');
    runSupabaseCommand(`gen types typescript --project-id ${projectId} --schema public`);
    
    console.log('Correção do esquema do banco de dados concluída com sucesso!');
  } catch (err) {
    console.error('Erro ao corrigir esquema do banco de dados:', err);
  }
}

// Executar o script
fixAvaliacaoSchema();
