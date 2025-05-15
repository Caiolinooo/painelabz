/**
 * Validadores de dados para importação de usuários
 */

/**
 * Valida um endereço de email
 * @param email Endereço de email para validar
 * @returns Objeto com resultado da validação
 */
export function validateEmail(email: string): { isValid: boolean; message?: string } {
  if (!email || email.trim() === '') {
    return { isValid: false, message: 'Email não pode ser vazio' };
  }

  // Expressão regular para validar email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Formato de email inválido' };
  }

  return { isValid: true };
}

/**
 * Valida um número de telefone
 * @param phone Número de telefone para validar
 * @returns Objeto com resultado da validação
 */
export function validatePhone(phone: string): { isValid: boolean; message?: string; normalized?: string } {
  if (!phone || phone.trim() === '') {
    return { isValid: false, message: 'Telefone não pode ser vazio' };
  }

  // Remover caracteres não numéricos
  const digits = phone.replace(/\D/g, '');

  // Verificar se tem pelo menos 10 dígitos (DDD + número)
  if (digits.length < 10) {
    return { isValid: false, message: 'Telefone deve ter pelo menos 10 dígitos (DDD + número)' };
  }

  // Normalizar o telefone
  let normalized = '';
  if (digits.length === 10 || digits.length === 11) {
    // Telefone brasileiro
    normalized = `+55${digits}`;
  } else if (digits.length > 11) {
    // Telefone internacional
    normalized = `+${digits}`;
  } else {
    normalized = digits;
  }

  return { isValid: true, normalized };
}

/**
 * Valida um CPF
 * @param cpf CPF para validar
 * @returns Objeto com resultado da validação
 */
export function validateCPF(cpf: string): { isValid: boolean; message?: string; normalized?: string } {
  if (!cpf || cpf.trim() === '') {
    return { isValid: false, message: 'CPF não pode ser vazio' };
  }

  // Remover caracteres não numéricos
  const digits = cpf.replace(/\D/g, '');

  // Verificar se tem 11 dígitos
  if (digits.length !== 11) {
    return { isValid: false, message: 'CPF deve ter 11 dígitos' };
  }

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(digits)) {
    return { isValid: false, message: 'CPF inválido' };
  }

  // Algoritmo de validação do CPF
  let sum = 0;
  let remainder;

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(digits.substring(9, 10))) {
    return { isValid: false, message: 'CPF inválido' };
  }

  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(digits.substring(10, 11))) {
    return { isValid: false, message: 'CPF inválido' };
  }

  // Normalizar o CPF
  const normalized = `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9, 11)}`;

  return { isValid: true, normalized };
}

/**
 * Valida uma data
 * @param date Data para validar
 * @returns Objeto com resultado da validação
 */
export function validateDate(date: string): { isValid: boolean; message?: string; normalized?: string } {
  if (!date || date.trim() === '') {
    return { isValid: false, message: 'Data não pode ser vazia' };
  }

  // Tentar converter para data
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    // Tentar formatos brasileiros (DD/MM/YYYY)
    const parts = date.split(/[\/.-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      
      const brDate = new Date(year, month, day);
      if (!isNaN(brDate.getTime())) {
        // Normalizar a data
        const normalized = `${brDate.getFullYear()}-${String(brDate.getMonth() + 1).padStart(2, '0')}-${String(brDate.getDate()).padStart(2, '0')}`;
        return { isValid: true, normalized };
      }
    }
    
    return { isValid: false, message: 'Formato de data inválido' };
  }

  // Normalizar a data
  const normalized = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  
  return { isValid: true, normalized };
}

/**
 * Valida um nome
 * @param name Nome para validar
 * @returns Objeto com resultado da validação
 */
export function validateName(name: string): { isValid: boolean; message?: string; normalized?: string } {
  if (!name || name.trim() === '') {
    return { isValid: false, message: 'Nome não pode ser vazio' };
  }

  // Verificar se tem pelo menos 3 caracteres
  if (name.trim().length < 3) {
    return { isValid: false, message: 'Nome deve ter pelo menos 3 caracteres' };
  }

  // Normalizar o nome (capitalizar)
  const normalized = name.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return { isValid: true, normalized };
}

/**
 * Valida um objeto de dados de usuário
 * @param userData Dados do usuário para validar
 * @returns Objeto com resultado da validação
 */
export function validateUserData(userData: any): { 
  isValid: boolean; 
  errors: Record<string, string>; 
  normalizedData?: Record<string, any> 
} {
  const errors: Record<string, string> = {};
  const normalizedData: Record<string, any> = { ...userData };

  // Validar nome
  if (userData.name) {
    const nameValidation = validateName(userData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.message || 'Nome inválido';
    } else if (nameValidation.normalized) {
      normalizedData.name = nameValidation.normalized;
    }
  } else {
    errors.name = 'Nome é obrigatório';
  }

  // Validar email
  if (userData.email) {
    const emailValidation = validateEmail(userData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message || 'Email inválido';
    }
  }

  // Validar telefone
  if (userData.phoneNumber) {
    const phoneValidation = validatePhone(userData.phoneNumber);
    if (!phoneValidation.isValid) {
      errors.phoneNumber = phoneValidation.message || 'Telefone inválido';
    } else if (phoneValidation.normalized) {
      normalizedData.phoneNumber = phoneValidation.normalized;
    }
  }

  // Validar CPF
  if (userData.document) {
    const cpfValidation = validateCPF(userData.document);
    if (!cpfValidation.isValid) {
      errors.document = cpfValidation.message || 'CPF inválido';
    } else if (cpfValidation.normalized) {
      normalizedData.document = cpfValidation.normalized;
    }
  }

  // Validar data de admissão
  if (userData.admissionDate) {
    const dateValidation = validateDate(userData.admissionDate);
    if (!dateValidation.isValid) {
      errors.admissionDate = dateValidation.message || 'Data de admissão inválida';
    } else if (dateValidation.normalized) {
      normalizedData.admissionDate = dateValidation.normalized;
    }
  }

  // Verificar se pelo menos um campo de contato está preenchido
  if (!userData.email && !userData.phoneNumber) {
    errors.contact = 'Pelo menos um campo de contato (email ou telefone) é obrigatório';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalizedData: Object.keys(errors).length === 0 ? normalizedData : undefined
  };
}
