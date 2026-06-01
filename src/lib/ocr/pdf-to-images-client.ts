'use client';

/**
 * Renderiza páginas de um PDF em imagens JPEG usando PDF.js + Canvas no navegador,
 * e executa OCR cliente-side usando Tesseract.js se o PDF for digitalizado/imagem.
 * Isso resolve o problema do Vercel serverless que não suporta o módulo nativo `canvas`
 * e do timeout da função de 10s no Vercel Hobby.
 */

let pdfjsLoaded: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (pdfjsLoaded) return pdfjsLoaded;

  const pdfjsLib = await import('pdfjs-dist');

  // Usar CDN para o worker — compatível com qualquer bundler
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  pdfjsLoaded = pdfjsLib;
  return pdfjsLib;
}

export interface RenderOptions {
  /** Máximo de páginas a renderizar (default: 5) */
  maxPages?: number;
  /** Escala de renderização. 1.5 = boa qualidade, 2.0 = alta (default: 1.5) */
  scale?: number;
  /** Qualidade JPEG 0-1 (default: 0.82) */
  quality?: number;
}

/**
 * Baixa um PDF e renderiza suas páginas como imagens JPEG base64.
 * Roda inteiramente no navegador usando Canvas API.
 */
export async function renderPdfToImages(
  pdfUrl: string,
  options?: RenderOptions
): Promise<string[]> {
  const { maxPages = 5, scale = 1.5, quality = 0.82 } = options || {};

  const pdfjsLib = await getPdfjs();

  // Baixar o PDF
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Falha ao baixar PDF: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // Carregar o documento PDF
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  const numPages = Math.min(pdf.numPages, maxPages);
  const images: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Criar canvas temporário no DOM (não precisa ser visível)
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Falha ao criar contexto Canvas 2D');

    // Renderizar a página no canvas
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Converter para JPEG base64
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    images.push(dataUrl);

    // Limpar canvas para liberar memória
    canvas.width = 0;
    canvas.height = 0;
  }

  await pdf.destroy();
  return images;
}

/**
 * Converte uma URL de imagem em data URI base64.
 */
export async function imageUrlToDataUri(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Falha ao baixar imagem: ${response.status}`);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao converter imagem para base64'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Extrai texto digital diretamente do PDF (se houver camada de texto selecionável).
 */
export async function extractTextFromDigitalPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await getPdfjs();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }
  await pdf.destroy();
  return fullText.trim();
}

let tesseractLoaded = false;

/**
 * Carrega dinamicamente o Tesseract.js do CDN no navegador.
 */
async function loadTesseract(): Promise<any> {
  if (tesseractLoaded && (window as any).Tesseract) {
    return (window as any).Tesseract;
  }

  const cdnUrl = 'https://unpkg.com/tesseract.js@v5.1.0/dist/tesseract.min.js';
  await new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${cdnUrl}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = cdnUrl;
    script.onload = () => {
      tesseractLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Falha ao carregar Tesseract.js do CDN'));
    document.head.appendChild(script);
  });

  return (window as any).Tesseract;
}

/**
 * Executa OCR em uma imagem (base64) no navegador.
 */
export async function runClientOcr(imageSrc: string): Promise<string> {
  const Tesseract = await loadTesseract();
  const { data: { text } } = await Tesseract.recognize(imageSrc, 'por');
  return text;
}

/**
 * Função unificada para extrair o texto de um PDF ou Imagem no lado do cliente.
 */
export async function extractTextFromPdfOrImageClient(
  fileUrl: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  const isPdf = fileUrl.split('?')[0].toLowerCase().endsWith('.pdf');
  
  if (isPdf) {
    onProgress?.('Baixando documento PDF...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Falha ao baixar PDF: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();

    onProgress?.('Verificando se o PDF contém texto digital...');
    const digitalText = await extractTextFromDigitalPdf(arrayBuffer);
    if (digitalText.length >= 30) {
      console.log(`[OCR/Client] Texto extraído digitalmente (${digitalText.length} caracteres).`);
      return digitalText;
    }

    onProgress?.('PDF escaneado detectado. Inicializando renderizador...');
    const pdfjsLib = await getPdfjs();
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    }).promise;

    const maxPages = 5;
    const numPages = Math.min(pdf.numPages, maxPages);
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(`Renderizando página ${i} de ${numPages}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Falha ao criar contexto Canvas 2D');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      
      canvas.width = 0;
      canvas.height = 0;

      onProgress?.(`Executando OCR na página ${i} de ${numPages}...`);
      const pageText = await runClientOcr(dataUrl);
      fullText += pageText + '\n\n';
    }

    await pdf.destroy();
    return fullText.trim();
  } else {
    onProgress?.('Baixando imagem...');
    const dataUri = await imageUrlToDataUri(fileUrl);
    onProgress?.('Executando OCR na imagem...');
    return await runClientOcr(dataUri);
  }
}
