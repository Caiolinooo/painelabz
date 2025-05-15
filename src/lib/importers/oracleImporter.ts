/**
 * Processador de arquivos Oracle HCM para importação de usuários
 * Suporta formatos de exportação do Oracle HCM Cloud e Oracle PeopleSoft
 */

import * as XLSX from 'xlsx';
import { UserImportData } from './userImporter';

/**
 * Processa um arquivo Oracle HCM
 */
export async function processOracleFile(file: File): Promise<UserImportData[]> {
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
          const users = jsonData.map(row => mapOracleDataToUserData(row));
          
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
              
              return mapOracleDataToUserData(row);
            });
          
          resolve(users);
        } else if (fileName.endsWith('.xml')) {
          // Processar como XML
          const content = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          
          // Verificar se houve erro no parsing
          const parseError = xmlDoc.getElementsByTagName('parsererror');
          if (parseError.length > 0) {
            reject(new Error('Erro ao parsear XML: ' + parseError[0].textContent));
            return;
          }
          
          // Tentar encontrar elementos que representam usuários
          const employeeElements = xmlDoc.getElementsByTagName('EMPLOYEE') || 
                                  xmlDoc.getElementsByTagName('Employee') || 
                                  xmlDoc.getElementsByTagName('employee') ||
                                  xmlDoc.getElementsByTagName('PERSON') ||
                                  xmlDoc.getElementsByTagName('Person') ||
                                  xmlDoc.getElementsByTagName('person');
          
          if (!employeeElements || employeeElements.length === 0) {
            reject(new Error('Não foi possível encontrar elementos de funcionários no XML'));
            return;
          }
          
          // Mapear elementos para objetos
          const users = Array.from(employeeElements).map(element => {
            const row: any = {};
            
            // Função para obter o valor de um elemento filho
            const getChildValue = (tagName: string) => {
              const child = element.getElementsByTagName(tagName)[0];
              return child ? child.textContent : '';
            };
            
            // Mapear campos comuns do Oracle HCM
            row.FULL_NAME = getChildValue('FULL_NAME') || getChildValue('FullName') || getChildValue('NAME');
            row.EMAIL = getChildValue('EMAIL') || getChildValue('EmailAddress') || getChildValue('EMAIL_ADDRESS');
            row.PHONE = getChildValue('PHONE') || getChildValue('PhoneNumber') || getChildValue('PHONE_NUMBER');
            row.DEPARTMENT = getChildValue('DEPARTMENT') || getChildValue('Department') || getChildValue('DEPT_NAME');
            row.POSITION = getChildValue('POSITION') || getChildValue('JobTitle') || getChildValue('JOB_TITLE');
            row.HIRE_DATE = getChildValue('HIRE_DATE') || getChildValue('HireDate') || getChildValue('START_DATE');
            row.EMPLOYEE_ID = getChildValue('EMPLOYEE_ID') || getChildValue('EmployeeId') || getChildValue('PERSON_ID');
            row.NATIONAL_ID = getChildValue('NATIONAL_ID') || getChildValue('NationalId') || getChildValue('TAX_ID');
            
            return mapOracleDataToUserData(row);
          });
          
          resolve(users);
        } else {
          reject(new Error('Formato de arquivo não suportado para Oracle HCM'));
        }
      } catch (error) {
        console.error('Erro ao processar arquivo Oracle HCM:', error);
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
 * Mapeia dados do Oracle HCM para o formato UserImportData
 */
function mapOracleDataToUserData(row: any): UserImportData {
  // Campos possíveis para cada propriedade no Oracle HCM
  const nameFields = [
    'FULL_NAME', 'PERSON_NAME', 'NAME', 'DISPLAY_NAME', 'PERSON_DISPLAY_NAME',
    'PERSON_FULL_NAME', 'FULL_NAME_DISPLAY', 'PERSON_NAME_DISPLAY', 'NAME_DISPLAY',
    'FullName', 'PersonName', 'DisplayName', 'PersonDisplayName', 'PersonFullName'
  ];
  const emailFields = [
    'EMAIL', 'EMAIL_ADDRESS', 'PERSON_EMAIL', 'PERSON_EMAIL_ADDRESS', 'WORK_EMAIL',
    'BUSINESS_EMAIL', 'COMPANY_EMAIL', 'CORPORATE_EMAIL', 'WORK_EMAIL_ADDRESS',
    'EmailAddress', 'WorkEmail', 'BusinessEmail', 'CompanyEmail', 'CorporateEmail'
  ];
  const phoneFields = [
    'PHONE', 'PHONE_NUMBER', 'PERSON_PHONE', 'PERSON_PHONE_NUMBER', 'WORK_PHONE',
    'BUSINESS_PHONE', 'COMPANY_PHONE', 'CORPORATE_PHONE', 'WORK_PHONE_NUMBER',
    'PhoneNumber', 'WorkPhone', 'BusinessPhone', 'CompanyPhone', 'CorporatePhone',
    'MOBILE', 'MOBILE_PHONE', 'MOBILE_NUMBER', 'CELL_PHONE', 'CELL_NUMBER'
  ];
  const departmentFields = [
    'DEPARTMENT', 'DEPARTMENT_NAME', 'DEPT', 'DEPT_NAME', 'DEPARTMENT_ID', 'DEPT_ID',
    'ORGANIZATION', 'ORGANIZATION_NAME', 'ORG', 'ORG_NAME', 'ORGANIZATION_ID', 'ORG_ID',
    'Department', 'DepartmentName', 'Organization', 'OrganizationName'
  ];
  const positionFields = [
    'POSITION', 'POSITION_NAME', 'JOB_TITLE', 'JOB', 'JOB_NAME', 'POSITION_ID', 'JOB_ID',
    'POSITION_TITLE', 'JOB_POSITION', 'JOB_POSITION_NAME', 'JOB_POSITION_TITLE',
    'JobTitle', 'Position', 'PositionName', 'PositionTitle', 'Job', 'JobName'
  ];
  const admissionDateFields = [
    'HIRE_DATE', 'HIRING_DATE', 'START_DATE', 'EMPLOYMENT_START_DATE', 'EMPLOYMENT_BEGIN_DATE',
    'EMPLOYMENT_START', 'EMPLOYMENT_BEGIN', 'HIRE_DATE_PERSON', 'PERSON_HIRE_DATE',
    'HireDate', 'StartDate', 'EmploymentStartDate', 'EmploymentBeginDate'
  ];
  const registrationFields = [
    'PERSON_ID', 'PERSON_NUMBER', 'PERSONNEL_NUMBER', 'PERSONNEL_ID', 'PERSON_CODE',
    'PERSON_KEY', 'PERSON_IDENTIFIER', 'EMPLOYEE_ID', 'EMPLOYEE_NUMBER', 'EMPLOYEE_CODE',
    'PersonId', 'PersonNumber', 'EmployeeId', 'EmployeeNumber', 'PersonIdentifier'
  ];
  const documentFields = [
    'DOCUMENT_NUMBER', 'ID_NUMBER', 'IDENTIFICATION_NUMBER', 'PERSONAL_ID_NUMBER',
    'PERSONAL_IDENTIFICATION_NUMBER', 'NATIONAL_ID', 'NATIONAL_ID_NUMBER',
    'CPF', 'CPF_NUMBER', 'TAX_ID', 'TAX_ID_NUMBER', 'SSN', 'SOCIAL_SECURITY_NUMBER',
    'DocumentNumber', 'IdNumber', 'NationalId', 'TaxId', 'SocialSecurityNumber'
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
