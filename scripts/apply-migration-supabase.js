/**
 * Script para aplicar a migração de tradução de cards usando Supabase
 */

// Carregar variáveis de ambiente
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Iniciando migração para adicionar campos de tradução aos cards...');

    // Verificar se as colunas já existem
    console.log('Verificando estrutura da tabela Card...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('Card')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Erro ao verificar tabela Card:', tableError);
      throw tableError;
    }

    // Verificar se as colunas de tradução já existem
    const hasColumns = tableInfo && tableInfo.length > 0 && tableInfo[0];
    const hasTitleEn = hasColumns && 'titleEn' in tableInfo[0];
    const hasDescriptionEn = hasColumns && 'descriptionEn' in tableInfo[0];

    console.log('Colunas existentes:', Object.keys(tableInfo[0] || {}));
    console.log('titleEn existe:', hasTitleEn);
    console.log('descriptionEn existe:', hasDescriptionEn);

    // Se as colunas não existirem, precisamos usar uma abordagem diferente
    // Como não podemos usar ALTER TABLE diretamente, vamos atualizar os registros existentes
    // com as novas propriedades, que serão adicionadas automaticamente pelo Supabase

    // Obter todos os cards existentes
    console.log('Obtendo cards existentes...');
    const { data: cards, error: cardsError } = await supabase
      .from('Card')
      .select('*');

    if (cardsError) {
      console.error('Erro ao obter cards:', cardsError);
      throw cardsError;
    }

    console.log(`Encontrados ${cards.length} cards para atualizar.`);

    // Precisamos usar uma abordagem diferente para adicionar a coluna descriptionEn
    // Vamos usar SQL bruto através da API REST do Supabase

    console.log('Adicionando coluna descriptionEn usando SQL...');

    try {
      // Fazer uma requisição POST para a API REST do Supabase
      const fetch = require('node-fetch');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          sql: 'ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "descriptionEn" TEXT'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro na API: ${JSON.stringify(errorData)}`);
      }

      console.log('Coluna descriptionEn adicionada com sucesso!');

      // Agora vamos atualizar os cards com valores vazios para a nova coluna
      console.log('Atualizando cards com valores vazios para descriptionEn...');

      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          sql: 'UPDATE "Card" SET "descriptionEn" = \'\' WHERE "descriptionEn" IS NULL'
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(`Erro na API: ${JSON.stringify(errorData)}`);
      }

      console.log('Cards atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao executar SQL:', error);
      throw error;
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar migração:', error);
  }
}

// Executar a migração
applyMigration();
