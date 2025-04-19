// Format phone number to support international formats
export const formatPhone = (value: string): string => {
  if (!value) return value;

  // Remove all non-digit characters
  const phone = value.replace(/\D/g, '');

  // Detect if it's an international number (starting with + or has more than 11 digits)
  const isInternational = phone.length > 11 || value.startsWith('+');

  if (isInternational) {
    // International format: +xx xx xxxx-xxxx
    if (phone.length <= 2) {
      return `+${phone}`;
    }
    if (phone.length <= 4) {
      return `+${phone.slice(0, 2)} ${phone.slice(2)}`;
    }
    if (phone.length <= 8) {
      return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4)}`;
    }

    // Format the rest with a hyphen
    return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 8)}-${phone.slice(8)}`;
  } else {
    // Brazilian format: (xx) xxxxx-xxxx
    if (phone.length <= 2) {
      return `(${phone}`;
    }
    if (phone.length <= 7) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2)}`;
    }
    if (phone.length <= 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }

    // For longer numbers, format as Brazilian
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`;
  }
};

// Format CPF to 000.000.000-00
export const formatCPF = (value: string): string => {
  if (!value) return value;

  // Remove all non-digit characters
  const cpf = value.replace(/\D/g, '');

  // Format according to length
  if (cpf.length <= 3) {
    return cpf;
  }
  if (cpf.length <= 6) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  }
  if (cpf.length <= 9) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  }

  // For a complete or almost complete CPF
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
};

// Format currency to Brazilian Real format (R$ x.xxx,xx)
export const formatCurrency = (value: string): string => {
  if (!value) return value;

  // Remove all non-digit characters
  let number = value.replace(/\D/g, '');

  // Ensure we don't have leading zeros
  number = number.replace(/^0+/, '');

  // If empty after cleaning, return empty string
  if (number === '') return '';

  // Convert to cents
  const cents = parseInt(number, 10);

  // Format with thousand separators and decimal point
  const formatted = (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatted;
};

// Generate a protocol number (used after form submission)
export const generateProtocol = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

  return `RB-${year}${month}${day}-${random}`;
};
