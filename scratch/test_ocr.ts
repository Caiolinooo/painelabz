import { processarDocumentoOCR } from '../src/lib/ocr/ocr-processor';
import path from 'path';

async function test() {
  const filePath = path.resolve('docs/E-social/exemplo-aso/Ludmilla Silva Oliveira - ASO Periódico - 2024.pdf');
  console.log('Testando extração do ASO:', filePath);
  
  const result = await processarDocumentoOCR(filePath, 'aso');
  console.log('Resultado do OCR/LLM:', JSON.stringify(result, null, 2));
}

test().catch(err => {
  console.error('Erro no teste:', err);
});
