/**
 * Wrapper para fetch que trata erros de parsing JSON
 */
import { buildApiUrl } from './api-url';

/**
 * Função para fazer requisições HTTP com tratamento de erros de parsing JSON
 * @param url URL da requisição
 * @param options Opções da requisição
 * @returns Resposta da requisição
 */
export async function fetchWithErrorHandling(url: string, options?: RequestInit): Promise<any> {
  try {
    // Use buildApiUrl for API endpoints if not already processed by the wrapper functions
    const fullUrl = url.startsWith('/api') || !url.startsWith('http')
      ? buildApiUrl(url.replace(/^\/api/, ''))
      : url;

    console.log(`Fetching from: ${fullUrl}`);
    const response = await fetch(fullUrl, options);

    // Verificar se a resposta é OK (status 2xx)
    if (!response.ok) {
      // Tentar obter o erro como JSON
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
      } catch (jsonError) {
        // Se não conseguir parsear como JSON, usar o texto da resposta
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error ${response.status}`);
      }
    }

    // Verificar se a resposta está vazia
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (jsonError) {
        console.error('Erro ao parsear resposta JSON:', jsonError);
        throw new Error('Erro ao processar resposta do servidor. A resposta não é um JSON válido.');
      }
    } else {
      // Se não for JSON, retornar o texto
      return await response.text();
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}

/**
 * Função para fazer requisições GET com tratamento de erros
 * @param url URL da requisição
 * @param options Opções da requisição
 * @returns Resposta da requisição
 */
export async function get(url: string, options?: RequestInit): Promise<any> {
  // Use buildApiUrl for API endpoints
  const fullUrl = url.startsWith('/api') || !url.startsWith('http')
    ? buildApiUrl(url.replace(/^\/api/, ''))
    : url;

  return fetchWithErrorHandling(fullUrl, {
    method: 'GET',
    ...options
  });
}

/**
 * Função para fazer requisições POST com tratamento de erros
 * @param url URL da requisição
 * @param data Dados a serem enviados
 * @param options Opções da requisição
 * @returns Resposta da requisição
 */
export async function post(url: string, data: any, options?: RequestInit): Promise<any> {
  // Use buildApiUrl for API endpoints
  const fullUrl = url.startsWith('/api') || !url.startsWith('http')
    ? buildApiUrl(url.replace(/^\/api/, ''))
    : url;

  return fetchWithErrorHandling(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * Função para fazer requisições PUT com tratamento de erros
 * @param url URL da requisição
 * @param data Dados a serem enviados
 * @param options Opções da requisição
 * @returns Resposta da requisição
 */
export async function put(url: string, data: any, options?: RequestInit): Promise<any> {
  // Use buildApiUrl for API endpoints
  const fullUrl = url.startsWith('/api') || !url.startsWith('http')
    ? buildApiUrl(url.replace(/^\/api/, ''))
    : url;

  return fetchWithErrorHandling(fullUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * Função para fazer requisições DELETE com tratamento de erros
 * @param url URL da requisição
 * @param options Opções da requisição
 * @returns Resposta da requisição
 */
export async function del(url: string, options?: RequestInit): Promise<any> {
  // Use buildApiUrl for API endpoints
  const fullUrl = url.startsWith('/api') || !url.startsWith('http')
    ? buildApiUrl(url.replace(/^\/api/, ''))
    : url;

  return fetchWithErrorHandling(fullUrl, {
    method: 'DELETE',
    ...options
  });
}

// Exportar todas as funções
export const fetchWrapper = {
  get,
  post,
  put,
  delete: del,
  fetchWithErrorHandling
};

export default fetchWrapper;
