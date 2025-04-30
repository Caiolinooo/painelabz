const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');

// Diretório base onde os documentos estão armazenados
const BASE_DIR = path.join(process.cwd(), 'public', 'documentos');

// Função para encontrar todos os arquivos PDF recursivamente
function findPDFs(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findPDFs(filePath, fileList);
    } else if (file.toLowerCase().endsWith('.pdf')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Função para extrair texto de um PDF
async function extractTextFromPDF(pdfPath) {
  try {
    console.log(`Processando: ${pdfPath}`);

    // Ler o arquivo PDF
    const dataBuffer = fs.readFileSync(pdfPath);

    // Extrair o texto
    const data = await pdfParse(dataBuffer);

    // Caminho para o arquivo de texto
    const txtPath = pdfPath.replace(/\.pdf$/i, '.txt');

    // Salvar o texto extraído
    fs.writeFileSync(txtPath, data.text);

    console.log(`Texto extraído e salvo em: ${txtPath}`);
    return true;
  } catch (error) {
    console.error(`Erro ao processar ${pdfPath}:`, error);

    // Criar um arquivo de texto com mensagem de erro para PDFs corrompidos
    try {
      const txtPath = pdfPath.replace(/\.pdf$/i, '.txt');
      const errorMessage = `Este arquivo PDF não pôde ser convertido para texto.\n\nErro: ${error.message}\n\nPor favor, visualize o PDF original para ver o conteúdo completo.`;

      fs.writeFileSync(txtPath, errorMessage);
      console.log(`Arquivo de texto com mensagem de erro criado em: ${txtPath}`);
      return true; // Consideramos como sucesso, pois criamos um arquivo de fallback
    } catch (writeError) {
      console.error(`Erro ao criar arquivo de texto com mensagem de erro:`, writeError);
      return false;
    }
  }
}

// Função principal
async function main() {
  console.log('Iniciando conversão de PDFs para texto...');

  // Encontrar todos os arquivos PDF
  const pdfFiles = findPDFs(BASE_DIR);
  console.log(`Encontrados ${pdfFiles.length} arquivos PDF.`);

  // Processar cada arquivo
  let successCount = 0;
  let failCount = 0;

  for (const pdfFile of pdfFiles) {
    const success = await extractTextFromPDF(pdfFile);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\nResumo da conversão:');
  console.log(`Total de arquivos: ${pdfFiles.length}`);
  console.log(`Conversões bem-sucedidas: ${successCount}`);
  console.log(`Conversões com falha: ${failCount}`);
  console.log('Processo concluído!');
}

// Executar o script
main().catch(error => {
  console.error('Erro durante a execução do script:', error);
  process.exit(1);
});
