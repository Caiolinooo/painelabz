/**
 * Função para fazer requisições HTTP com tratamento de erros de parsing JSON
 */
export async function fetchWithErrorHandling(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);
    
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
 * Função para fazer login com tratamento de erros
 */
export async function loginWithCredentials(identifier: string, password: string): Promise<any> {
  try {
    const isEmail = identifier.includes('@');
    
    const response = await fetchWithErrorHandling('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [isEmail ? 'email' : 'phoneNumber']: identifier,
        password
      }),
    });
    
    return response;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
}
