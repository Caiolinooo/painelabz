import { Locale } from '@/i18n';

/**
 * Obtém o caminho do documento traduzido com base no idioma atual
 * 
 * Convenção de nomenclatura:
 * - Documentos em português: /caminho/para/documento.pdf
 * - Documentos em inglês: /caminho/para/documento.en-US.pdf
 * - Outros idiomas: /caminho/para/documento.[código-idioma].pdf
 * 
 * @param originalPath Caminho original do documento
 * @param locale Código do idioma atual
 * @returns Caminho do documento traduzido
 */
export function getLocalizedDocumentPath(originalPath: string, locale: Locale): string {
  // Se o idioma for o padrão (pt-BR), retornar o caminho original
  if (locale === 'pt-BR') {
    return originalPath;
  }

  // Verificar se o caminho já contém um código de idioma
  const hasLocalePattern = /\.([a-z]{2}-[A-Z]{2})\./i;
  if (hasLocalePattern.test(originalPath)) {
    // Se já tiver um código de idioma, substituir pelo atual
    return originalPath.replace(hasLocalePattern, `.${locale}.`);
  }

  // Inserir o código de idioma antes da extensão
  const lastDotIndex = originalPath.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // Se não tiver extensão, adicionar o código no final
    return `${originalPath}.${locale}`;
  }

  // Inserir o código antes da extensão
  const extension = originalPath.substring(lastDotIndex);
  const basePath = originalPath.substring(0, lastDotIndex);
  return `${basePath}.${locale}${extension}`;
}

/**
 * Verifica se um documento existe no servidor
 * 
 * @param path Caminho do documento
 * @returns Promise que resolve para true se o documento existir
 */
export async function documentExists(path: string): Promise<boolean> {
  try {
    // Normalizar o caminho para URL completa
    let url = path;
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    }

    // Verificar se o arquivo existe
    const response = await fetch(url, { 
      method: 'HEAD',
      cache: 'no-cache'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar existência do documento:', error);
    return false;
  }
}

/**
 * Obtém o caminho do documento traduzido, verificando se ele existe
 * Se o documento traduzido não existir, retorna o caminho original
 * 
 * @param originalPath Caminho original do documento
 * @param locale Código do idioma atual
 * @returns Promise que resolve para o caminho do documento
 */
export async function getAvailableLocalizedDocumentPath(originalPath: string, locale: Locale): Promise<string> {
  // Se o idioma for o padrão (pt-BR), retornar o caminho original
  if (locale === 'pt-BR') {
    return originalPath;
  }

  // Obter o caminho traduzido
  const localizedPath = getLocalizedDocumentPath(originalPath, locale);
  
  // Verificar se o documento traduzido existe
  const exists = await documentExists(localizedPath);
  
  // Retornar o caminho traduzido se existir, ou o original caso contrário
  return exists ? localizedPath : originalPath;
}
