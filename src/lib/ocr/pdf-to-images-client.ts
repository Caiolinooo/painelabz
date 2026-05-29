'use client';

/**
 * Renderiza páginas de um PDF em imagens JPEG usando PDF.js + Canvas no navegador.
 * Isso resolve o problema do Vercel serverless que não suporta o módulo nativo `canvas`.
 * O navegador possui Canvas API nativo, então funciona sem dependências extras.
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
 * 
 * @param pdfUrl URL pública do PDF (Supabase storage, etc.)
 * @param options Opções de renderização
 * @returns Array de data URIs JPEG (data:image/jpeg;base64,...)
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

    // Converter para JPEG base64 (JPEG é muito menor que PNG)
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
 * Útil para enviar imagens já existentes (JPG/PNG) à API.
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
 * Determina se uma URL aponta para um PDF (pela extensão ou Content-Type).
 */
export function isPdfUrl(url: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.pdf');
}

/**
 * Determina se uma URL aponta para uma imagem.
 */
export function isImageUrl(url: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return /\.(png|jpe?g|webp|gif)$/.test(cleanUrl);
}
