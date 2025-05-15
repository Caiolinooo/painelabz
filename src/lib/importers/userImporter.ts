import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { processJSONFile } from './jsonImporter';
import { processXMLFile } from './xmlImporter';
import { processTOTVSFile } from './totvsImporter';
import { processSAPFile } from './sapImporter';
import { processOracleFile } from './oracleImporter';
import { validateUserData } from '../validators/dataValidators';

// Tipos de importação suportados
export enum ImportType {
  EXCEL = 'excel',
  CSV = 'csv',
  WK = 'wk',
  DOMINIO = 'dominio',
  OFFICE365 = 'office365',
  JSON = 'json',
  XML = 'xml',
  TOTVS = 'totvs',
  SAP = 'sap',
  ORACLE = 'oracle',
  CUSTOM = 'custom',
}

// Interface para os dados do usuário
export interface UserImportData {
  name: string;
  email?: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  admissionDate?: string;
  registration?: string;
  document?: string;
  notes?: string;
  [key: string]: any; // Para campos adicionais
}

// Resultado da importação
export interface ImportResult {
  success: boolean;
  data?: UserImportData[];
  error?: string;
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
}

/**
 * Processa um arquivo para importação de usuários
 */
export async function processUserImportFile(
  file: File,
  importType: ImportType
): Promise<ImportResult> {
  try {
    // Verificar tamanho do arquivo (limite de 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'O arquivo excede o tamanho máximo permitido (10MB)',
      };
    }

    // Verificar tipo de arquivo
    if (!isValidFileType(file, importType)) {
      return {
        success: false,
        error: `Tipo de arquivo inválido para importação ${importType}`,
      };
    }

    // Processar o arquivo de acordo com o tipo
    let data: UserImportData[] = [];

    switch (importType) {
      case ImportType.EXCEL:
        data = await processExcelFile(file);
        break;
      case ImportType.CSV:
        data = await processCSVFile(file);
        break;
      case ImportType.WK:
        data = await processWKFile(file);
        break;
      case ImportType.DOMINIO:
        data = await processDominioFile(file);
        break;
      case ImportType.OFFICE365:
        data = await processOffice365File(file);
        break;
      case ImportType.JSON:
        data = await processJSONFile(file);
        break;
      case ImportType.XML:
        data = await processXMLFile(file);
        break;
      case ImportType.TOTVS:
        data = await processTOTVSFile(file);
        break;
      case ImportType.SAP:
        data = await processSAPFile(file);
        break;
      case ImportType.ORACLE:
        data = await processOracleFile(file);
        break;
      case ImportType.CUSTOM:
        // Para formato personalizado, tentamos detectar o tipo de arquivo
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (fileExt === 'xlsx' || fileExt === 'xls') {
          data = await processExcelFile(file);
        } else if (fileExt === 'csv') {
          data = await processCSVFile(file);
        } else if (fileExt === 'json') {
          data = await processJSONFile(file);
        } else if (fileExt === 'xml') {
          data = await processXMLFile(file);
        } else if (fileExt === 'txt') {
          // Tentar detectar o formato do arquivo de texto
          const textContent = await readFileAsText(file);
          if (textContent.includes('|')) {
            data = await processWKFile(file);
          } else {
            data = await processDominioFile(file);
          }
        } else {
          return {
            success: false,
            error: 'Formato de arquivo não suportado para importação personalizada',
          };
        }
        break;
      default:
        return {
          success: false,
          error: 'Tipo de importação não suportado',
        };
    }

    // Validar dados
    const validationResult = validateImportData(data);

    return {
      success: true,
      data: validationResult.validData,
      totalRows: data.length,
      validRows: validationResult.validData.length,
      invalidRows: validationResult.invalidData.length,
    };
  } catch (error) {
    console.error('Erro ao processar arquivo de importação:', error);
    return {
      success: false,
      error: `Erro ao processar arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    };
  }
}

/**
 * Verifica se o tipo de arquivo é válido para o tipo de importação
 */
function isValidFileType(file: File, importType: ImportType): boolean {
  const fileName = file.name.toLowerCase();

  switch (importType) {
    case ImportType.EXCEL:
      return fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    case ImportType.CSV:
      return fileName.endsWith('.csv');
    case ImportType.WK:
    case ImportType.DOMINIO:
      return fileName.endsWith('.txt') || fileName.endsWith('.csv');
    case ImportType.OFFICE365:
      return fileName.endsWith('.xlsx');
    case ImportType.JSON:
      return fileName.endsWith('.json');
    case ImportType.XML:
      return fileName.endsWith('.xml');
    case ImportType.TOTVS:
      return fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.xlsx');
    case ImportType.CUSTOM:
      // Para formato personalizado, aceitamos vários tipos de arquivo
      return fileName.endsWith('.xlsx') ||
             fileName.endsWith('.xls') ||
             fileName.endsWith('.csv') ||
             fileName.endsWith('.txt') ||
             fileName.endsWith('.json') ||
             fileName.endsWith('.xml');
    default:
      return false;
  }
}

/**
 * Processa um arquivo Excel
 */
async function processExcelFile(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Mapear para o formato esperado
        const users = jsonData.map((row: any) => ({
          name: row.nome || row.name || row.Nome || row.NAME || '',
          email: row.email || row.Email || row.EMAIL || row['e-mail'] || row['E-MAIL'] || '',
          phoneNumber: row.telefone || row.Telefone || row.TELEFONE || row.celular || row.Celular || row.CELULAR || row.phone || row.Phone || row.PHONE || '',
          department: row.departamento || row.Departamento || row.DEPARTAMENTO || row.setor || row.Setor || row.SETOR || '',
          position: row.cargo || row.Cargo || row.CARGO || row.funcao || row.Funcao || row.FUNCAO || '',
        }));

        resolve(users);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Processa um arquivo CSV
 */
async function processCSVFile(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          // Mapear para o formato esperado
          const users = results.data.map((row: any) => ({
            name: row.nome || row.name || row.Nome || row.NAME || '',
            email: row.email || row.Email || row.EMAIL || row['e-mail'] || row['E-MAIL'] || '',
            phoneNumber: row.telefone || row.Telefone || row.TELEFONE || row.celular || row.Celular || row.CELULAR || row.phone || row.Phone || row.PHONE || '',
            department: row.departamento || row.Departamento || row.DEPARTAMENTO || row.setor || row.Setor || row.SETOR || '',
            position: row.cargo || row.Cargo || row.CARGO || row.funcao || row.Funcao || row.FUNCAO || '',
          }));

          resolve(users);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
}

/**
 * Processa um arquivo no formato WK
 */
async function processWKFile(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim() !== '');

        // Formato WK: cada linha tem campos separados por |
        const users = lines.map(line => {
          const fields = line.split('|');

          // Formato esperado: Nome|Email|Telefone|Departamento|Cargo
          return {
            name: fields[0]?.trim() || '',
            email: fields[1]?.trim() || '',
            phoneNumber: fields[2]?.trim() || '',
            department: fields[3]?.trim() || '',
            position: fields[4]?.trim() || '',
          };
        });

        resolve(users);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Processa um arquivo no formato Dominio
 */
async function processDominioFile(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim() !== '');

        // Formato Dominio: cada linha tem campos com tamanho fixo
        const users = lines.map(line => {
          // Formato esperado:
          // Posições 1-50: Nome
          // Posições 51-100: Email
          // Posições 101-120: Telefone
          // Posições 121-150: Departamento
          // Posições 151-180: Cargo
          return {
            name: line.substring(0, 50).trim(),
            email: line.substring(50, 100).trim(),
            phoneNumber: line.substring(100, 120).trim(),
            department: line.substring(120, 150).trim(),
            position: line.substring(150, 180).trim(),
          };
        });

        resolve(users);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Valida os dados importados
 */
function validateImportData(data: UserImportData[]): {
  validData: UserImportData[];
  invalidData: UserImportData[];
  warnings: { userId: number; field: string; message: string }[];
} {
  const validData: UserImportData[] = [];
  const invalidData: UserImportData[] = [];
  const warnings: { userId: number; field: string; message: string }[] = [];

  data.forEach((user, index) => {
    // Validar dados do usuário
    const validation = validateUserData(user);

    if (validation.isValid && validation.normalizedData) {
      // Adicionar dados normalizados
      validData.push(validation.normalizedData as UserImportData);
    } else {
      // Adicionar aos dados inválidos
      invalidData.push(user);

      // Adicionar avisos para cada erro
      if (validation.errors) {
        Object.entries(validation.errors).forEach(([field, message]) => {
          warnings.push({
            userId: index,
            field,
            message
          });
        });
      }
    }
  });

  return { validData, invalidData, warnings };
}

/**
 * Processa um arquivo no formato Office 365
 * Otimizado para o formato de exportação do Office 365
 */
async function processOffice365File(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Pegar a primeira planilha
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        // Mapear para o formato esperado com suporte específico para cabeçalhos do Office 365
        const users = jsonData.map((row: any) => {
          // Mapeamento específico para o formato Office 365
          const nameFields = ['Nome Completo', 'Nome', 'Full Name', 'Name', 'nome completo'];
          const emailFields = ['Email', 'E-mail', 'E-Mail', 'email', 'e-mail'];
          const phoneFields = ['Telefone', 'Phone', 'Celular', 'Mobile', 'telefone', 'celular'];
          const departmentFields = ['Departamento', 'Department', 'Setor', 'Area', 'departamento', 'setor'];
          const positionFields = ['Cargo', 'Position', 'Função', 'Job Title', 'cargo', 'função', 'funcao'];
          const admissionDateFields = ['Data de Admissão', 'Admission Date', 'Data Admissão', 'data admissao'];
          const registrationFields = ['Matrícula', 'Registration', 'Registro', 'ID', 'matricula', 'registro'];
          const documentFields = ['CPF', 'CNPJ', 'Documento', 'Document', 'cpf', 'cnpj', 'documento'];
          const notesFields = ['Observações', 'Notes', 'Notas', 'Obs', 'observacoes', 'notas', 'obs'];

          // Função para encontrar o primeiro campo válido
          const findFirstValidField = (fields: string[]) => {
            for (const field of fields) {
              if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
                return row[field];
              }
            }
            return '';
          };

          return {
            name: findFirstValidField(nameFields),
            email: findFirstValidField(emailFields),
            phoneNumber: findFirstValidField(phoneFields),
            department: findFirstValidField(departmentFields),
            position: findFirstValidField(positionFields),
            admissionDate: findFirstValidField(admissionDateFields),
            registration: findFirstValidField(registrationFields),
            document: findFirstValidField(documentFields),
            notes: findFirstValidField(notesFields),
          };
        });

        resolve(users);
      } catch (error) {
        console.error('Erro ao processar arquivo Office 365:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Lê um arquivo como texto
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Normaliza um número de telefone
 */
function normalizePhoneNumber(phone: string): string {
  // Remover caracteres não numéricos
  const digits = phone.replace(/\D/g, '');

  // Garantir que tenha o formato correto
  if (digits.length >= 10) {
    // Adicionar código do país se não tiver
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    return `+${digits}`;
  }

  return phone;
}
