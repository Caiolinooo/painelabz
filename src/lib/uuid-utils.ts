/**
 * Utilitários para trabalhar com UUIDs
 */

/**
 * Verifica se uma string é um UUID válido
 * @param str String a ser verificada
 * @returns true se for um UUID válido, false caso contrário
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Gera um UUID v4 aleatório
 * @returns UUID v4 como string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Converte um ID para UUID se possível
 * Se o ID já for um UUID válido, retorna o próprio ID
 * Se não for, tenta encontrar um UUID correspondente no mapeamento
 * Se não encontrar, gera um novo UUID
 * 
 * @param id ID a ser convertido
 * @param idMapping Mapeamento de IDs para UUIDs
 * @returns UUID válido
 */
export function convertToUUID(id: string, idMapping: Record<string, string> = {}): string {
  // Se já for um UUID válido, retorna o próprio ID
  if (isValidUUID(id)) {
    return id;
  }
  
  // Se existir no mapeamento, retorna o UUID correspondente
  if (idMapping[id]) {
    return idMapping[id];
  }
  
  // Caso contrário, gera um novo UUID
  return generateUUID();
}

/**
 * Cria um mapeamento de IDs para UUIDs
 * Útil para converter IDs simples (como "1", "2", etc.) para UUIDs válidos
 * 
 * @param ids Lista de IDs a serem mapeados
 * @returns Objeto com mapeamento de IDs para UUIDs
 */
export function createUUIDMapping(ids: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  ids.forEach(id => {
    if (!isValidUUID(id)) {
      mapping[id] = generateUUID();
    }
  });
  
  return mapping;
}
