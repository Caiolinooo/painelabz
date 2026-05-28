import { supabaseAdmin } from '@/lib/supabase';
import type { OCRTipoDocumento, OCRExtractResult, OCRConfig } from '@/types/ocr';
import fs from 'fs';
import path from 'path';

let configCache: { data: OCRConfig; time: number } | null = null;
const CONFIG_TTL = 60000;

async function getOCRConfigFromDB(): Promise<OCRConfig> {
  if (configCache && Date.now() - configCache.time < CONFIG_TTL) {
    return configCache.data;
  }
  try {
    const { data } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'ocr')
      .maybeSingle();
    if (data?.value) {
      const cfg = { idioma: 'por', qualidade: 'normal', ...(data.value as Record<string, any>) } as OCRConfig;
      configCache = { data: cfg, time: Date.now() };
      return cfg;
    }
  } catch { /* fallback */ }
  const fallback: OCRConfig = { idioma: 'por', qualidade: 'normal' };
  configCache = { data: fallback, time: Date.now() };
  return fallback;
}

function extrairDadosTexto(texto: string, tipoDocumento?: OCRTipoDocumento): Record<string, any> {
  const dados: Record<string, any> = {};
  const upper = texto.toUpperCase();

  const cpfMatch = texto.match(/(\d{3})[.\s]?(\d{3})[.\s]?(\d{3})[.\s-]?(\d{2})/);
  if (cpfMatch) dados.cpf = `${cpfMatch[1]}${cpfMatch[2]}${cpfMatch[3]}${cpfMatch[4]}`;

  const rgLabeled = upper.match(/(?:RG|IDENTIDADE|REGISTRO\s*GERAL)[:\s]*(\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[.\s-]?\d{0,2})/i);
  if (rgLabeled) {
    dados.rg = rgLabeled[1].replace(/[.\s-]/g, '');
  } else {
    const rgPlain = texto.match(/(\d{1,2})[.\s]?(\d{3})[.\s]?(\d{3})[.\s-]?(\d{0,2})/);
    if (rgPlain) {
      const cleanedRg = rgPlain[0].replace(/[.\s-]/g, '');
      const cleanedCpf = dados.cpf ? dados.cpf.replace(/[.\s-]/g, '') : '';
      if (!cleanedCpf || !cleanedCpf.includes(cleanedRg)) {
        dados.rg = cleanedRg;
      }
    }
  }

  const nomeMatch = upper.match(/(?:NOME|NOME\s*COMPLETO)[:\s]*([A-ZÀ-Ú\x20\t]+)/);
  if (nomeMatch) dados.nome_completo = nomeMatch[1].trim();

  // Try targeted match for date of birth first (DN or NASCIMENTO prefixes)
  const dnMatch = texto.match(/(?:DN|NASC|NASCIMENTO|NASC\.?|NASCIDO\s*EM)[:\s-]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
  if (dnMatch) {
    dados.data_nascimento = `${dnMatch[3]}-${dnMatch[2]}-${dnMatch[1]}`;
  } else {
    // Non-prefix fallback, but verify it doesn't match common exam years like 2024 if it's birthday
    const dataNasc = texto.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dataNasc) {
      const year = parseInt(dataNasc[3]);
      // A birthday should be earlier than 2015 for active workers
      if (year < 2015) {
        dados.data_nascimento = `${dataNasc[3]}-${dataNasc[2]}-${dataNasc[1]}`;
      }
    }
  }

  const maeMatch = upper.match(/(?:FILIAÇÃO|MÃE|MAE)[:\s]*([A-ZÀ-Ú\s]+)/);
  if (maeMatch) dados.nome_mae = maeMatch[1].trim();

  const paiMatch = upper.match(/(?:PAI)[:\s]*([A-ZÀ-Ú\s]+)/);
  if (paiMatch) dados.nome_pai = paiMatch[1].trim();

  const ctpsMatch = upper.match(/CTPS[:\s]*(\d+)/);
  if (ctpsMatch) dados.ctps = ctpsMatch[1];

  const cnhMatch = upper.match(/CNH[:\s]*(\d+)/);
  if (cnhMatch) dados.numero_cnh = cnhMatch[1];

  const pisMatch = upper.match(/PIS[:\s]*(\d+)/);
  if (pisMatch) dados.pis_pasep = pisMatch[1];

  const ruaMatch = upper.match(/(?:RUA|AVENIDA|AV|TRAVESSA|PRACA|ESTRADA)[:\s]*([A-ZÀ-Ú\s0-9,]+)/);
  if (ruaMatch) dados.endereco_logradouro = ruaMatch[1].trim();

  const cepMatch = texto.match(/(\d{5})-?(\d{3})/);
  if (cepMatch) dados.endereco_cep = `${cepMatch[1]}-${cepMatch[2]}`;

  if (tipoDocumento === 'aso') {
    if (/inapto/i.test(texto) && !/nao\s+aplicav|não\s+aplicáv|em\s+caso\s+de\s+inapti/i.test(texto)) {
      dados.resultado = 'inapto';
    } else if (/apto\s+condicional/i.test(texto)) {
      dados.resultado = 'apto_condicional';
    } else if (/apto/i.test(texto)) {
      dados.resultado = 'apto';
    }

    const datasEncontradas = [...texto.matchAll(/\d{2}\/\d{2}\/\d{4}/g)];
    if (datasEncontradas.length > 0) {
      const validas = datasEncontradas
        .map(m => ({ d: m[0], val: m[0] }))
        .filter(m => {
          const [dia, mes, ano] = m.d.split('/');
          const d = parseInt(dia), me = parseInt(mes), a = parseInt(ano);
          return d >= 1 && d <= 31 && me >= 1 && me <= 12 && a >= 2020 && a <= 2030;
        });
      if (validas.length > 0) {
        const ultima = validas[validas.length - 1];
        dados.data_realizacao = ultima.d;
      } else {
        dados.data_realizacao = datasEncontradas[datasEncontradas.length - 1][0];
      }
    }

    const medicoMatch = texto.match(/(?:Dr\.?\s*[ºª]?\s*|Dra\.?\s*[ºª]?\s*|Médico\s+Examinador[\s:]*)([A-Za-zÀ-ÖØ-öø-ÿçãõ\s]{10,60})(?:\r?\n|CRM)/i);
    if (medicoMatch) dados.medico = medicoMatch[1].trim();

    const crmMatch = texto.match(/(?:CRM|C\.R\.M\.|RM|IM)\s*(?:-?\s*[A-Z]{2})?\s*[:|I\-\s]*\s*([\d][\d.\s-]{4,}\d)/i);
    if (crmMatch) {
      dados.medico_crm = crmMatch[1].replace(/[.\s-]/g, '');
    }

    const cnpjMatch = texto.match(/(?:CNPJ|C\.N\.P\.J)\s*[:|I\s-]*\s*(\d{2}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*\/\s*\d{4}\s*-\s*\d{2}|\d{14})/i);
    if (cnpjMatch) dados.cnpj_clinica = cnpjMatch[1].replace(/[^\d]/g, '');
    const clinicaMatch = texto.match(/(?:Clínica|Clinica|Centro\s+Médico|Laboratório|Laboratorio)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]{4,60})/i);
    if (clinicaMatch) dados.nome_clinica = clinicaMatch[1].trim();
  }

  if (tipoDocumento === 'passaporte') {
    const passaporteMatch = texto.match(/[A-Z]{2}\d{6,7}/);
    if (passaporteMatch) dados.numero_passaporte = passaporteMatch[0];
  }

  if (tipoDocumento === 'cnh') {
    if (!dados.numero_cnh) {
      const cnhNum = texto.match(/\d{11}/);
      if (cnhNum) dados.numero_cnh = cnhNum[0];
    }
  }

  return dados;
}

async function obterConteudoArquivo(arquivoUrl: string): Promise<{ buffer: Buffer; ext: string }> {
  if (arquivoUrl.startsWith('data:')) {
    const match = arquivoUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Data URI inválida');
    const mime = match[1];
    const data = match[2];
    const buffer = Buffer.from(data, 'base64');
    let ext = mime.split('/')[1] || '';
    if (ext === 'vnd.openxmlformats-officedocument.wordprocessingml.document') ext = 'docx';
    if (ext === 'vnd.openxmlformats-officedocument.spreadsheetml.sheet') ext = 'xlsx';
    return { buffer, ext };
  }

  if (arquivoUrl.startsWith('http://') || arquivoUrl.startsWith('https://')) {
    const response = await fetch(arquivoUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar arquivo da URL: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Detect structure from Content-Type
    const contentType = response.headers.get('content-type') || '';
    let ext = '';
    if (contentType.includes('pdf')) ext = 'pdf';
    else if (contentType.includes('word') || contentType.includes('officedocument.wordprocessingml')) ext = 'docx';
    else if (contentType.includes('sheet') || contentType.includes('officedocument.spreadsheetml')) ext = 'xlsx';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('text/plain')) ext = 'txt';
    else if (contentType.includes('csv')) ext = 'csv';

    // Se não encontrou pelo Content-Type, tentar pelo nome do arquivo na URL
    if (!ext) {
      const urlSemParams = arquivoUrl.split('?')[0];
      const parsedExt = path.extname(urlSemParams).toLowerCase().replace('.', '');
      if (parsedExt) ext = parsedExt;
    }

    return { buffer, ext };
  }

  // Caminho local
  try {
    const localPath = path.resolve(arquivoUrl);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(localPath).toLowerCase().replace('.', '');
      return { buffer, ext };
    }
  } catch (err) {
    // Ignore and let it fail below
  }

  throw new Error(`Caminho ou URL de arquivo inválido: ${arquivoUrl}`);
}

async function detectarExtensao(buffer: Buffer, extIndicada: string): Promise<string> {
  if (buffer.length < 4) return extIndicada || 'txt';
  
  // PDF: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'pdf';
  }
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'png';
  }
  
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpg';
  }
  
  // ZIP / DOCX / XLSX: PK..
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);
      if (zip.file('word/document.xml')) {
        return 'docx';
      }
      if (zip.file('xl/workbook.xml')) {
        return 'xlsx';
      }
    } catch {
      // ignore zip identification error and fallback
    }
    return 'zip';
  }
  
  return extIndicada || 'txt';
}

async function ocrPdfDigitalizado(buffer: Buffer, idioma: string = 'por'): Promise<{ texto: string; confianca: number }> {
  try {
    const canvasModule = await import('canvas');
    const canvas = (canvasModule as any).createCanvas ? canvasModule : ((canvasModule as any).default || canvasModule);
    
    const pdfjsModule = await import('pdfjs-dist');
    const pdfjs = (pdfjsModule as any).getDocument ? pdfjsModule : ((pdfjsModule as any).default || pdfjsModule);
    
    if (typeof window === 'undefined') {
      // No ambiente Node.js (Server/Vercel), deixamos o pdfjs-dist resolver o fake worker internamente.
      // O Next.js foi configurado (outputFileTracingIncludes) para garantir que o pdf.worker.mjs esteja na pasta.
    }
    
    class CustomCanvasFactory {
      create(width: number, height: number) {
        const _canvas = canvas.createCanvas(width, height);
        const _context = _canvas.getContext('2d');
        return {
          canvas: _canvas,
          context: _context,
        };
      }
      reset(canvasAndContext: any, width: number, height: number) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
        canvasAndContext.context = canvasAndContext.canvas.getContext('2d');
      }
      destroy(canvasAndContext: any) {
        if (canvasAndContext.canvas) {
          canvasAndContext.canvas.width = 0;
          canvasAndContext.canvas.height = 0;
          canvasAndContext.canvas = null;
        }
        canvasAndContext.context = null;
      }
    }

    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data,
      CanvasFactory: CustomCanvasFactory,
    });
    const pdfDoc = await loadingTask.promise;
    
    const totalPages = pdfDoc.numPages;
    const textPages: string[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 2.5 });
      const nodeCanvas = canvas.createCanvas(viewport.width, viewport.height);
      const context = nodeCanvas.getContext('2d');

      context.imageSmoothingEnabled = true;

      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
        CanvasFactory: CustomCanvasFactory,
      };

      await page.render(renderContext).promise;

      const imageData = context.getImageData(0, 0, viewport.width, viewport.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const threshold = gray > 128 ? 255 : 0;
        data[i] = threshold;
        data[i + 1] = threshold;
        data[i + 2] = threshold;
      }

      context.putImageData(imageData, 0, 0);
      const pngBuffer = nodeCanvas.toBuffer('image/png');

      const pageOcr = await processarComTesseract(pngBuffer, idioma);
      if (pageOcr) {
        textPages.push(pageOcr.texto);
        totalConfidence += pageOcr.confianca;
        confidenceCount++;
      }
    }
    
    const avgConfidence = confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0;
    return {
      texto: textPages.join('\n\n'),
      confianca: avgConfidence
    };
  } catch (error: any) {
    console.error('[OCR/PDF] Stack trace do erro:', error.stack || error);
    throw new Error(`Erro ao realizar OCR em PDF digitalizado: ${error.message}`);
  }
}

async function processarPDF(buffer: Buffer, idioma: string = 'por'): Promise<{ texto: string; confianca: number }> {
  let digitalTexto = '';
  try {
    // @ts-ignore
    const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule.default || pdfParseModule);
    const data = await pdfParse(buffer);
    digitalTexto = data.text || '';
  } catch (error: any) {
    console.warn(`[OCR/PDF] Erro ao extrair texto digital do PDF, tentando OCR via canvas: ${error.message}`);
  }

  // Se extraiu texto e parece conter conteúdo real (mais de 10 caracteres)
  if (digitalTexto.trim().length >= 10) {
    return {
      texto: digitalTexto,
      confianca: 100,
    };
  }

  console.log('[OCR/PDF] O PDF parece ser digitalizado (imagem) ou está sem camada de texto. Executando OCR via canvas...');
  return await ocrPdfDigitalizado(buffer, idioma);
}

async function processarDOCX(buffer: Buffer): Promise<{ texto: string; confianca: number }> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file('word/document.xml')?.async('text');
    if (!docXml) {
      throw new Error('Documento Word inválido (word/document.xml não encontrado)');
    }
    
    const paragraphs = docXml.split('<w:p');
    const textParts: string[] = [];
    
    for (const p of paragraphs) {
      const matches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (matches) {
        const pText = matches
          .map(m => {
            const content = m.replace(/<w:t[^>]*>|<\/w:t>/g, '');
            return content
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'");
          })
          .join('');
        if (pText.trim()) {
          textParts.push(pText);
        }
      }
    }
    
    return {
      texto: textParts.join('\n'),
      confianca: 100,
    };
  } catch (error: any) {
    throw new Error(`Erro ao extrair texto do Word (.docx): ${error.message}`);
  }
}

async function processarXLSX(buffer: Buffer): Promise<{ texto: string; confianca: number }> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const textParts: string[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        textParts.push(`--- Planilha: ${sheetName} ---`);
        textParts.push(csv);
      }
    }
    
    return {
      texto: textParts.join('\n\n'),
      confianca: 100,
    };
  } catch (error: any) {
    throw new Error(`Erro ao extrair dados do Excel (.xlsx): ${error.message}`);
  }
}

async function processarTXT(buffer: Buffer): Promise<{ texto: string; confianca: number }> {
  return {
    texto: buffer.toString('utf-8'),
    confianca: 100,
  };
}

function limparTextoOCR(texto: string): string {
  return texto
    .replace(/[|¦\\]/g, 'I')
    .replace(/[‘’'`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '.')
    .replace(/[©®™]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function processarComTesseract(
  buffer: Buffer,
  idioma: string = 'por'
): Promise<{ texto: string; confianca: number } | null> {
  try {
    const Tesseract = await import('tesseract.js');
    const { data } = await Tesseract.recognize(buffer, idioma, {
      logger: () => {},
    });
    return { texto: limparTextoOCR(data.text), confianca: data.confidence };
  } catch (error) {
    console.error('[OCR Tesseract] Erro:', error);
    return null;
  }
}

async function extrairDadosComLLM(texto: string, tipoDocumento: OCRTipoDocumento): Promise<Record<string, any> | null> {
  try {
    const { getIAConfig, chatCompletion } = await import('@/lib/ia/client');
    const config = await getIAConfig();
    if (!config || !config.ativo) {
      console.log('[OCR/LLM] Nenhuma configuração ativa de IA encontrada no banco.');
      return null;
    }

    const systemPrompt = `Você é um extrator de dados estruturados especializado em Atestados de Saúde Ocupacional (ASO) no padrão brasileiro e-Social.
Dada a extração bruta de texto (OCR) de um ASO, seu trabalho é identificar com máxima precisão os seguintes campos em formato JSON:
{
  "cpf": "somente números do CPF do colaborador",
  "rg": "somente números do RG do colaborador (não confunda com CPF!)",
  "nome_completo": "Nome completo do colaborador (apenas o nome, em maiúsculas)",
  "data_nascimento": "Data de nascimento do colaborador no formato YYYY-MM-DD",
  "tipo_exame": "Selecione estritamente uma das opções: 'admissional', 'periodico', 'demissional', 'retorno', 'mudanca_funcao'",
  "resultado": "Selecione estritamente uma das opções: 'apto', 'inapto', 'apto_condicional'",
  "data_realizacao": "Data de emissão/conclusão do ASO no formato YYYY-MM-DD",
  "medico_examinador_nome": "Nome do médico que assina/examina",
  "medico_examinador_crm": "Apenas números do CRM do médico examinador",
  "medico_examinador_uf": "UF do CRM do médico examinador (ex: RJ, SP, etc)",
  "medico_pcmso_nome": "Nome do médico coordenador do PCMSO",
  "medico_pcmso_crm": "Apenas números do CRM do médico coordenador",
  "medico_pcmso_uf": "UF do CRM do médico coordenador (ex: RJ, SP, etc)",
  "cnpj_clinica": "Apenas números do CNPJ da clínica (se disponível)",
  "nome_clinica": "Nome da clínica ou laboratório",
  "exames_realizados": [
    {
      "nome": "Nome do exame (ex: ELETROCARDIOGRAMA, GLICOSE, etc)",
      "data": "Data do exame no formato YYYY-MM-DD"
    }
  ]
}

Atenção especial (Regras de Negócio):
1. EMPRESA X CLÍNICA: A empresa "Águas", "Águas do Brasil", "Grupo Águas" ou "ABZ" é a EMPRESA CONTRATANTE (Empregador). NUNCA defina esses nomes como "nome_clinica". A clínica será um laboratório ou centro de saúde ocupacional emitente do laudo.
2. RG e CPF: Nunca confunda o CPF do colaborador com o RG dele. CPF tem formato XXX.XXX.XXX-XX. RG varia e costuma ser menor.
3. Nome Completo: Certifique-se de retornar apenas o nome da pessoa e ignorar textos subsequentes de empresas/linhas adicionais.
4. Resultado: Se o documento contiver tanto "APTO" quanto "INAPTO" (como em formulários com caixa de seleção), avalie o contexto ou qual caixa/marcação está selecionada (como "(X) APTO" ou "to) APTO" vs "( ) INAPTO").
5. Data de nascimento: Procure especificamente por rótulos como DN, DATA NASCIMENTO, NASCIMENTO, NASC:, etc. Não retorne a data de realização do exame como data de nascimento.
6. Diferencie o Médico Examinador (quem assina/carimba o exame atual) do Médico Coordenador (responsável pelo PCMSO).
7. Exames: Liste TODOS os procedimentos/exames clínicos realizados no paciente, com suas respectivas datas. Se houver "EXAME CLINICO - ASO", adicione na lista.
8. Datas: Retorne todas as datas estritamente no formato YYYY-MM-DD.
9. Evite deduções incertas. Não duplique dados e não preencha campos de clínica com informações da empresa contratante.

Retorne APENAS o objeto JSON válido, sem explicações, sem blocos de código markdown.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: texto }
    ];

    console.log('[OCR/LLM] Enviando texto ao LLM para extração inteligente do ASO...');
    const response = await chatCompletion(messages, { temperature: 0.1 });
    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('[OCR/LLM] Resposta do LLM veio vazia.');
      return null;
    }

    let jsonText = content.trim();

    // Remover blocos de raciocínio (como <think>...</think> do DeepSeek/Qwen)
    if (jsonText.includes('</think>')) {
      const index = jsonText.indexOf('</think>');
      jsonText = jsonText.substring(index + 8).trim();
    }
    if (jsonText.includes('<think>')) {
      jsonText = jsonText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    }

    if (jsonText.startsWith('```')) {
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }

    const parsed = JSON.parse(jsonText);
    console.log('[OCR/LLM] Dados extraídos via LLM com sucesso:', parsed);
    return parsed;
  } catch (err: any) {
    console.warn('[OCR/LLM] Falha ao extrair dados do ASO via LLM, usando fallback de regex:', err.message);
    return null;
  }
}

export async function processarDocumentoOCR(
  arquivoUrl: string,
  tipoDocumento?: OCRTipoDocumento
): Promise<OCRExtractResult> {
  try {
    if (!arquivoUrl) {
      return { success: false, error: 'URL do arquivo é obrigatória' };
    }

    const config = await getOCRConfigFromDB();
    let resultado: { texto: string; dadosExtraidos: Record<string, any>; confianca: number } | null = null;

    if (config.fallback_api_url) {
      try {
        const response = await fetch(config.fallback_api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.fallback_api_key ? { 'Authorization': `Bearer ${config.fallback_api_key}` } : {}),
          },
          body: ***REMOVED*** imageUrl: arquivoUrl }),
        });
        if (response.ok) {
          const extData = await response.json();
          resultado = {
            texto: extData.texto || extData.text || '',
            dadosExtraidos: extData.dadosExtraidos || {},
            confianca: extData.confianca || extData.confidence || 0,
          };
        }
      } catch (err) {
        console.warn('[OCR] Falha API externa, usando extrator local:', err);
      }
    }

    if (!resultado) {
      // 1. Obter conteúdo do arquivo como buffer
      const { buffer, ext: extIndicada } = await obterConteudoArquivo(arquivoUrl);
      
      // 2. Detectar a extensão real pelo magic number ou cabeçalho
      const ext = await detectarExtensao(buffer, extIndicada);
      
      console.log(`[OCR/Parser] Roteando arquivo do tipo: ${ext}`);

      let parseResult: { texto: string; confianca: number } | null = null;

      if (ext === 'pdf') {
        parseResult = await processarPDF(buffer, config.idioma);
      } else if (ext === 'docx') {
        parseResult = await processarDOCX(buffer);
      } else if (ext === 'xlsx') {
        parseResult = await processarXLSX(buffer);
      } else if (ext === 'txt' || ext === 'csv') {
        parseResult = await processarTXT(buffer);
      } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        parseResult = await processarComTesseract(buffer, config.idioma);
      } else {
        // Fallback genérico: Tenta Tesseract, senão lê como texto bruto
        try {
          parseResult = await processarComTesseract(buffer, config.idioma);
        } catch {
          parseResult = await processarTXT(buffer);
        }
      }

      if (!parseResult) {
        return { success: false, error: `Não foi possível processar ou extrair texto do documento do tipo ${ext}` };
      }

      resultado = {
        texto: parseResult.texto,
        dadosExtraidos: {},
        confianca: parseResult.confianca,
      };
    }

    // Tentar extração inteligente via LLM se for ASO e a IA estiver configurada
    let dadosIa: Record<string, any> | null = null;
    if (tipoDocumento === 'aso') {
      dadosIa = await extrairDadosComLLM(resultado.texto, tipoDocumento);
    }

    // Filtra chaves nulas ou vazias da IA para não sobrescrever o fallback de regex
    const dadosIaLimpos: Record<string, any> = {};
    if (dadosIa) {
      Object.keys(dadosIa).forEach(key => {
        if (dadosIa[key] !== null && dadosIa[key] !== undefined && dadosIa[key] !== '') {
          dadosIaLimpos[key] = dadosIa[key];
        }
      });
    }

    resultado.dadosExtraidos = {
      ...extrairDadosTexto(resultado.texto, tipoDocumento),
      ...dadosIaLimpos,
      ...resultado.dadosExtraidos,
    };

    return { success: true, data: resultado };
  } catch (error) {
    console.error('[OCR] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export function invalidateConfigCache(): void {
  configCache = null;
}
