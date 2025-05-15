/**
 * Processador de arquivos SAP para importação de usuários
 * Suporta formatos de exportação do SAP SuccessFactors e SAP HCM
 */

import * as XLSX from 'xlsx';
import { UserImportData } from './userImporter';

/**
 * Processa um arquivo SAP
 */
export async function processSAPFile(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = async (e) => {
      try {
        // Verificar o tipo de arquivo
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          // Processar como Excel
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Pegar a primeira planilha
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Converter para JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Mapear para o formato esperado
          const users = jsonData.map(row => mapSAPDataToUserData(row));
          
          resolve(users);
        } else if (fileName.endsWith('.csv')) {
          // Processar como CSV
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim() !== '');
          
          // Verificar se há linhas para processar
          if (lines.length === 0) {
            reject(new Error('Arquivo CSV vazio'));
            return;
          }
          
          // Detectar delimitador (ponto e vírgula ou vírgula)
          const firstLine = lines[0];
          const delimiter = firstLine.includes(';') ? ';' : ',';
          
          // Obter cabeçalhos
          const headers = lines[0].split(delimiter).map(h => h.trim());
          
          // Processar linhas
          const users = lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
              const values = line.split(delimiter).map(v => v.trim());
              const row: any = {};
              
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              
              return mapSAPDataToUserData(row);
            });
          
          resolve(users);
        } else {
          reject(new Error('Formato de arquivo não suportado para SAP'));
        }
      } catch (error) {
        console.error('Erro ao processar arquivo SAP:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

/**
 * Mapeia dados do SAP para o formato UserImportData
 */
function mapSAPDataToUserData(row: any): UserImportData {
  // Campos possíveis para cada propriedade no SAP
  const nameFields = [
    'FULL_NAME', 'EMPLOYEE_NAME', 'ENAME', 'NAME', 'DISPLAY_NAME', 'EMPLOYEE_FULLNAME',
    'PERNR_NAME', 'EMPLOYEE_DISPLAY_NAME', 'EMPLOYEE_FULL_NAME', 'FULL_NAME_LATIN',
    'EMPLOYEE_FULL_NAME_LATIN', 'EMPLOYEE_DISPLAY_NAME_LATIN', 'DISPLAY_NAME_LATIN'
  ];
  const emailFields = [
    'EMAIL', 'EMAIL_ADDRESS', 'EMPLOYEE_EMAIL', 'EMPLOYEE_EMAIL_ADDRESS', 'WORK_EMAIL',
    'BUSINESS_EMAIL', 'COMPANY_EMAIL', 'CORPORATE_EMAIL', 'WORK_EMAIL_ADDRESS',
    'BUSINESS_EMAIL_ADDRESS', 'COMPANY_EMAIL_ADDRESS', 'CORPORATE_EMAIL_ADDRESS'
  ];
  const phoneFields = [
    'PHONE', 'PHONE_NUMBER', 'EMPLOYEE_PHONE', 'EMPLOYEE_PHONE_NUMBER', 'WORK_PHONE',
    'BUSINESS_PHONE', 'COMPANY_PHONE', 'CORPORATE_PHONE', 'WORK_PHONE_NUMBER',
    'BUSINESS_PHONE_NUMBER', 'COMPANY_PHONE_NUMBER', 'CORPORATE_PHONE_NUMBER',
    'MOBILE', 'MOBILE_PHONE', 'MOBILE_NUMBER', 'CELL_PHONE', 'CELL_NUMBER'
  ];
  const departmentFields = [
    'DEPARTMENT', 'DEPARTMENT_NAME', 'DEPT', 'DEPT_NAME', 'DEPARTMENT_ID', 'DEPT_ID',
    'ORGANIZATIONAL_UNIT', 'ORG_UNIT', 'ORG_UNIT_NAME', 'ORGANIZATIONAL_UNIT_NAME',
    'ORGEH', 'ORGEH_TEXT', 'ORGUNIT', 'ORGUNIT_TEXT'
  ];
  const positionFields = [
    'POSITION', 'POSITION_NAME', 'JOB_TITLE', 'JOB', 'JOB_NAME', 'POSITION_ID', 'JOB_ID',
    'POSITION_TITLE', 'JOB_POSITION', 'JOB_POSITION_NAME', 'JOB_POSITION_TITLE',
    'PLANS', 'PLANS_TEXT', 'STELL', 'STELL_TEXT'
  ];
  const admissionDateFields = [
    'HIRE_DATE', 'HIRING_DATE', 'START_DATE', 'EMPLOYMENT_START_DATE', 'EMPLOYMENT_BEGIN_DATE',
    'EMPLOYMENT_START', 'EMPLOYMENT_BEGIN', 'HIRE_DATE_EMPLOYEE', 'EMPLOYEE_HIRE_DATE',
    'BEGDA', 'ENTRY_DATE', 'ENTRY_DATE_EMPLOYEE', 'EMPLOYEE_ENTRY_DATE'
  ];
  const registrationFields = [
    'EMPLOYEE_ID', 'EMPLOYEE_NUMBER', 'PERSONNEL_NUMBER', 'PERSONNEL_ID', 'EMPLOYEE_CODE',
    'EMPLOYEE_KEY', 'EMPLOYEE_IDENTIFIER', 'PERNR', 'PERSONALNUMBER', 'PERSONAL_NUMBER',
    'EMPLID', 'EMPL_ID', 'EMPLOYEE_IDENT'
  ];
  const documentFields = [
    'DOCUMENT_NUMBER', 'ID_NUMBER', 'IDENTIFICATION_NUMBER', 'PERSONAL_ID_NUMBER',
    'PERSONAL_IDENTIFICATION_NUMBER', 'NATIONAL_ID', 'NATIONAL_ID_NUMBER',
    'CPF', 'CPF_NUMBER', 'TAX_ID', 'TAX_ID_NUMBER', 'SSN', 'SOCIAL_SECURITY_NUMBER'
  ];

  // Função para encontrar o primeiro campo válido
  const findFirstValidField = (fields: string[]) => {
    for (const field of fields) {
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        return row[field];
      }
    }
    return '';
  };

  // Mapear para o formato esperado
  return {
    name: findFirstValidField(nameFields),
    email: findFirstValidField(emailFields),
    phoneNumber: findFirstValidField(phoneFields),
    department: findFirstValidField(departmentFields),
    position: findFirstValidField(positionFields),
    admissionDate: findFirstValidField(admissionDateFields),
    registration: findFirstValidField(registrationFields),
    document: findFirstValidField(documentFields),
    notes: '',
  };
}
