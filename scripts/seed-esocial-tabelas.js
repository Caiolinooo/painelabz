require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('Erro: DATABASE_URL deve estar definido no .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Simple CSV parser that handles pipes
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const map = new Map();
  
  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split('|');
    if (parts.length >= 2) {
      const codigo = parts[0] ? parts[0].trim() : '';
      if (!codigo) continue;
      
      map.set(codigo, {
        codigo: codigo,
        descricao: parts[1] ? parts[1].trim() : '',
        dt_inicio: parts[2] ? parts[2].trim() : null,
        dt_fim: parts[3] ? parts[3].trim() : null
      });
    }
  }
  return Array.from(map.values());
}

async function batchInsert(tableName, data) {
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    // Construct query
    let queryText = `INSERT INTO public.${tableName} (codigo, descricao, dt_inicio, dt_fim) VALUES `;
    const values = [];
    
    batch.forEach((row, idx) => {
      const offset = idx * 4;
      queryText += `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})${idx < batch.length - 1 ? ',' : ''}`;
      values.push(row.codigo, row.descricao, row.dt_inicio, row.dt_fim);
    });
    
    queryText += ` ON CONFLICT (codigo) DO UPDATE SET 
                  descricao = EXCLUDED.descricao, 
                  dt_inicio = EXCLUDED.dt_inicio, 
                  dt_fim = EXCLUDED.dt_fim, 
                  updated_at = timezone('utc'::text, now())`;
                  
    try {
      await client.query(queryText, values);
    } catch (err) {
      console.error(`Erro inserindo lote na tabela ${tableName} no offset ${i}:`, err);
      throw err;
    }
  }
  console.log(`✓ Tabela ${tableName} populada com sucesso: ${data.length} registros.`);
}

async function run() {
  console.log('Iniciando o seed das tabelas do e-Social...');
  await client.connect();
  
  try {
    const pathTab27 = path.join(__dirname, '..', 'docs', 'E-social', 'Codigos', 'TABELA27_v2_Conteudo.csv');
    const pathTab50 = path.join(__dirname, '..', 'docs', 'E-social', 'Codigos', 'TABELA50_v10_Conteudo.csv');
    
    console.log('Lendo Tabela 27...');
    const data27 = parseCSV(pathTab27);
    console.log(`Lidos ${data27.length} registros da Tabela 27.`);
    
    console.log('Lendo Tabela 50...');
    const data50 = parseCSV(pathTab50);
    console.log(`Lidos ${data50.length} registros da Tabela 50.`);
    
    console.log('Populando esocial_tabela_27...');
    await batchInsert('esocial_tabela_27', data27);
    
    console.log('Populando esocial_tabela_50...');
    await batchInsert('esocial_tabela_50', data50);
    
    console.log('Seed concluído com sucesso!');
  } catch (err) {
    console.error('Erro geral no seed:', err);
  } finally {
    await client.end();
  }
}

run();
