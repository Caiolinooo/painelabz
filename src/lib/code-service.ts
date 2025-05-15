/**
 * Serviço in-house para gerenciamento de códigos de verificação
 * Armazena os códigos em memória para facilitar o desenvolvimento e testes
 */

// Armazenamento em memória para os códigos de verificação
interface VerificationEntry {
  code: string;
  identifier: string;
  method: 'email' | 'sms';
  timestamp: Date;
  expires: Date;
  used: boolean;
}

// Armazenar os códigos em memória (apenas para desenvolvimento)
const verificationCodes: VerificationEntry[] = [];

/**
 * Gera um código de verificação aleatório
 * @returns Código de verificação de 6 dígitos
 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Registra um novo código de verificação
 * @param identifier Email ou telefone do usuário
 * @param method Método de envio (email ou sms)
 * @returns Objeto com o código gerado e informações relacionadas
 */
export function registerCode(
  identifier: string,
  method: 'email' | 'sms' = 'sms'
): {
  code: string;
  expires: Date;
} {
  // Gerar código
  const code = generateCode();

  // Calcular data de expiração (15 minutos por padrão)
  const expiryMinutes = parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '15');
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + expiryMinutes);

  // Registrar o código
  const entry: VerificationEntry = {
    code,
    identifier,
    method,
    timestamp: new Date(),
    expires,
    used: false
  };

  console.log(`[CODE-SERVICE] Gerando novo código ${code} para ${identifier} via ${method}`);
  console.log(`[CODE-SERVICE] Código expira em: ${expires.toISOString()}`);
  console.log(`[CODE-SERVICE] Códigos em memória antes da limpeza: ${verificationCodes.length}`);

  // Remover códigos antigos para o mesmo identificador
  const index = verificationCodes.findIndex(
    (c) => c.identifier === identifier && c.method === method
  );

  if (index !== -1) {
    console.log(`[CODE-SERVICE] Removendo código antigo ${verificationCodes[index].code} para ${identifier}`);
    verificationCodes.splice(index, 1);
  }

  // Adicionar o novo código
  verificationCodes.push(entry);
  console.log(`[CODE-SERVICE] Novo código adicionado. Total de códigos: ${verificationCodes.length}`);

  // Limpar códigos expirados
  cleanupExpiredCodes();

  console.log(`[CODE-SERVICE] Código ${code} registrado para ${identifier} via ${method}`);
  console.log(`[CODE-SERVICE] Códigos em memória após limpeza: ${verificationCodes.length}`);

  return {
    code,
    expires
  };
}

/**
 * Verifica se um código é válido
 * @param identifier Email ou telefone do usuário
 * @param code Código fornecido pelo usuário
 * @param method Método de envio (email ou sms)
 * @returns Verdadeiro se o código for válido
 */
export function verifyCode(
  identifier: string,
  code: string,
  method: 'email' | 'sms' = 'sms'
): boolean {
  console.log(`[CODE-SERVICE] Verificando código ${code} para ${identifier} via ${method}`);
  console.log(`[CODE-SERVICE] Códigos em memória: ${verificationCodes.length}`);

  // Listar todos os códigos para o identificador
  const codesForIdentifier = verificationCodes.filter(
    (c) => c.identifier === identifier && c.method === method
  );

  console.log(`[CODE-SERVICE] Códigos para ${identifier} via ${method}: ${codesForIdentifier.length}`);
  codesForIdentifier.forEach((c, i) => {
    console.log(`[CODE-SERVICE] Código ${i+1}: ${c.code}, Expiração: ${c.expires.toISOString()}, Usado: ${c.used}`);
  });

  // Buscar o código
  const entry = verificationCodes.find(
    (c) =>
      c.identifier === identifier &&
      c.method === method &&
      c.code === code &&
      !c.used
  );

  // Se não encontrou, retornar falso
  if (!entry) {
    console.log(`[CODE-SERVICE] Código ${code} não encontrado para ${identifier} via ${method}`);
    return false;
  }

  // Verificar se o código expirou
  const now = new Date();
  if (now > entry.expires) {
    console.log(`[CODE-SERVICE] Código ${code} expirado para ${identifier} via ${method}`);
    console.log(`[CODE-SERVICE] Expiração: ${entry.expires.toISOString()}, Agora: ${now.toISOString()}`);
    return false;
  }

  // Marcar o código como usado
  entry.used = true;

  console.log(`[CODE-SERVICE] Código ${code} verificado com sucesso para ${identifier} via ${method}`);

  return true;
}

/**
 * Limpa códigos expirados da memória
 */
function cleanupExpiredCodes(): void {
  const now = new Date();
  const initialCount = verificationCodes.length;

  // Remover códigos expirados
  for (let i = verificationCodes.length - 1; i >= 0; i--) {
    if (now > verificationCodes[i].expires || verificationCodes[i].used) {
      verificationCodes.splice(i, 1);
    }
  }

  const removedCount = initialCount - verificationCodes.length;
  if (removedCount > 0) {
    console.log(`[CODE-SERVICE] ${removedCount} códigos expirados ou usados foram removidos`);
  }
}

/**
 * Obtém todos os códigos ativos (apenas para debug)
 * @returns Lista de códigos ativos
 */
export function getActiveCodes(): VerificationEntry[] {
  cleanupExpiredCodes();
  return [...verificationCodes];
}

/**
 * Obtém o código mais recente para um identificador (apenas para debug)
 * @param identifier Email ou telefone do usuário
 * @returns Código mais recente ou null se não encontrado
 */
export function getLatestCode(identifier: string): string | null {
  console.log(`[CODE-SERVICE] Buscando código mais recente para ${identifier}`);
  console.log(`[CODE-SERVICE] Total de códigos em memória: ${verificationCodes.length}`);

  cleanupExpiredCodes();

  // Listar todos os códigos para o identificador
  const codesForIdentifier = verificationCodes.filter(c => c.identifier === identifier);

  console.log(`[CODE-SERVICE] Códigos encontrados para ${identifier}: ${codesForIdentifier.length}`);
  codesForIdentifier.forEach((c, i) => {
    console.log(`[CODE-SERVICE] Código ${i+1}: ${c.code}, Método: ${c.method}, Expiração: ${c.expires.toISOString()}, Usado: ${c.used}`);
  });

  // Ordenar por timestamp (mais recente primeiro)
  const sorted = [...codesForIdentifier]
    .filter(c => !c.used)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const latestCode = sorted.length > 0 ? sorted[0].code : null;

  if (latestCode) {
    console.log(`[CODE-SERVICE] Código mais recente para ${identifier}: ${latestCode}`);
  } else {
    console.log(`[CODE-SERVICE] Nenhum código ativo encontrado para ${identifier}`);
  }

  return latestCode;
}
