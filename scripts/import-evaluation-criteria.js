/**
 * Script para importar critérios de avaliação do arquivo Excel para o banco de dados Supabase
 */

const XLSX = require('xlsx');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Caminho para o arquivo Excel
const excelFilePath = path.join(__dirname, '..', 'docs', 'AN-TED-002-R0 - Avaliação de Desempenho.xlsx');

async function importCriterios() {
  try {
    console.log('Iniciando importação de critérios de avaliação...');
    console.log(`Lendo arquivo: ${excelFilePath}`);

    // Ler o arquivo Excel
    const workbook = XLSX.readFile(excelFilePath);
    
    // Obter a planilha que contém os critérios (assumindo que é a primeira)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converter para JSON
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Encontrados ${data.length} registros na planilha`);
    
    // Filtrar e mapear apenas os dados relevantes para critérios
    const criterios = data
      .filter(row => row.Nome && row.Categoria) // Filtrar linhas que têm nome e categoria
      .map(row => ({
        nome: row.Nome || row.NOME || row.nome || row.Critério || row.CRITÉRIO || row.critério || '',
        descricao: row.Descricao || row.DESCRICAO || row.descricao || row.Descrição || row.DESCRIÇÃO || row.descrição || '',
        categoria: row.Categoria || row.CATEGORIA || row.categoria || '',
        peso: parseFloat(row.Peso || row.PESO || row.peso || 1.0) || 1.0,
        pontuacao_maxima: parseInt(row.Pontuacao_Maxima || row.PONTUACAO_MAXIMA || row.pontuacao_maxima || 
                                  row['Pontuação Máxima'] || row['PONTUAÇÃO MÁXIMA'] || row['pontuação máxima'] || 5) || 5,
        ativo: true
      }));
    
    if (criterios.length === 0) {
      console.log('Nenhum critério válido encontrado na planilha. Tentando formato alternativo...');
      
      // Tentar um formato alternativo (pode ser necessário ajustar com base no formato real do arquivo)
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });
      
      // Procurar cabeçalhos
      let headerRow = -1;
      let headers = {};
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Verificar se esta linha parece ser um cabeçalho
        if (Object.values(row).some(val => 
          typeof val === 'string' && 
          (val.toLowerCase().includes('nome') || 
           val.toLowerCase().includes('critério') || 
           val.toLowerCase().includes('categoria')))) {
          
          headerRow = i;
          
          // Mapear cabeçalhos
          Object.entries(row).forEach(([col, val]) => {
            if (typeof val === 'string') {
              const valLower = val.toLowerCase();
              if (valLower.includes('nome') || valLower.includes('critério')) headers.nome = col;
              else if (valLower.includes('desc')) headers.descricao = col;
              else if (valLower.includes('categ')) headers.categoria = col;
              else if (valLower.includes('peso')) headers.peso = col;
              else if (valLower.includes('pont') || valLower.includes('max')) headers.pontuacao_maxima = col;
            }
          });
          
          break;
        }
      }
      
      if (headerRow >= 0 && Object.keys(headers).length >= 2) {
        console.log(`Cabeçalhos encontrados na linha ${headerRow + 1}:`, headers);
        
        // Extrair dados com base nos cabeçalhos encontrados
        const dataCriterios = [];
        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[headers.nome] && (headers.categoria ? row[headers.categoria] : true)) {
            dataCriterios.push({
              nome: row[headers.nome] || '',
              descricao: headers.descricao ? (row[headers.descricao] || '') : '',
              categoria: headers.categoria ? (row[headers.categoria] || 'Geral') : 'Geral',
              peso: headers.peso ? (parseFloat(row[headers.peso]) || 1.0) : 1.0,
              pontuacao_maxima: headers.pontuacao_maxima ? (parseInt(row[headers.pontuacao_maxima]) || 5) : 5,
              ativo: true
            });
          }
        }
        
        if (dataCriterios.length > 0) {
          console.log(`Encontrados ${dataCriterios.length} critérios no formato alternativo`);
          criterios.push(...dataCriterios);
        }
      }
    }
    
    if (criterios.length === 0) {
      console.error('Não foi possível encontrar critérios válidos no arquivo Excel');
      process.exit(1);
    }
    
    console.log(`Processados ${criterios.length} critérios para importação`);
    
    // Verificar critérios existentes para evitar duplicatas
    const { data: existingCriterios, error: existingError } = await supabase
      .from('criterios')
      .select('nome')
      .is('deleted_at', null);
    
    if (existingError) {
      console.error('Erro ao verificar critérios existentes:', existingError);
      process.exit(1);
    }
    
    const existingNames = new Set((existingCriterios || []).map(c => c.nome.toLowerCase()));
    
    // Filtrar apenas critérios que não existem
    const criteriosToInsert = criterios.filter(c => !existingNames.has(c.nome.toLowerCase()));
    
    if (criteriosToInsert.length === 0) {
      console.log('Todos os critérios já existem no banco de dados');
      process.exit(0);
    }
    
    console.log(`Inserindo ${criteriosToInsert.length} novos critérios...`);
    
    // Inserir critérios no banco de dados
    const { data: insertedData, error: insertError } = await supabase
      .from('criterios')
      .insert(criteriosToInsert)
      .select();
    
    if (insertError) {
      console.error('Erro ao inserir critérios:', insertError);
      process.exit(1);
    }
    
    console.log(`${insertedData.length} critérios importados com sucesso!`);
    
    // Exibir os critérios importados
    console.log('Critérios importados:');
    insertedData.forEach((criterio, index) => {
      console.log(`${index + 1}. ${criterio.nome} (${criterio.categoria}) - Peso: ${criterio.peso}`);
    });
    
  } catch (error) {
    console.error('Erro durante a importação:', error);
    process.exit(1);
  }
}

// Executar a função principal
importCriterios();
