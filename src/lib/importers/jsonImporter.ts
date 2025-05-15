/**
 * Processador de arquivos JSON para importação de usuários
 */

import { UserImportData } from './userImporter';

/**
 * Processa um arquivo JSON
 */
export async function processJSONFile(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        // Verificar se é um array
        if (!Array.isArray(jsonData)) {
          // Se for um objeto com uma propriedade que é um array, usar essa propriedade
          const possibleArrayProps = Object.keys(jsonData).filter(key => 
            Array.isArray(jsonData[key]) && jsonData[key].length > 0
          );
          
          if (possibleArrayProps.length > 0) {
            // Usar a primeira propriedade que é um array
            const arrayProp = possibleArrayProps[0];
            processJSONArray(jsonData[arrayProp], resolve, reject);
          } else {
            // Tentar tratar como um único objeto
            const users = [mapJSONToUserData(jsonData)];
            resolve(users);
          }
        } else {
          // Processar array diretamente
          processJSONArray(jsonData, resolve, reject);
        }
      } catch (error) {
        console.error('Erro ao processar arquivo JSON:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Processa um array de objetos JSON
 */
function processJSONArray(jsonArray: any[], resolve: (value: UserImportData[]) => void, reject: (reason?: any) => void) {
  try {
    // Mapear para o formato esperado
    const users = jsonArray.map(item => mapJSONToUserData(item));
    resolve(users);
  } catch (error) {
    console.error('Erro ao processar array JSON:', error);
    reject(error);
  }
}

/**
 * Mapeia um objeto JSON para o formato UserImportData
 */
function mapJSONToUserData(item: any): UserImportData {
  // Campos possíveis para cada propriedade
  const nameFields = ['name', 'fullName', 'nome', 'nomeCompleto', 'displayName', 'userName', 'user_name', 'full_name'];
  const emailFields = ['email', 'emailAddress', 'e-mail', 'mail', 'email_address', 'userEmail', 'user_email'];
  const phoneFields = ['phone', 'phoneNumber', 'telefone', 'celular', 'mobile', 'mobilePhone', 'phone_number', 'mobile_phone'];
  const departmentFields = ['department', 'departamento', 'setor', 'area', 'dept', 'sector', 'businessUnit', 'business_unit'];
  const positionFields = ['position', 'cargo', 'funcao', 'função', 'jobTitle', 'job_title', 'role', 'title'];
  const admissionDateFields = ['admissionDate', 'dataAdmissao', 'admission_date', 'hireDate', 'hire_date', 'startDate', 'start_date'];
  const registrationFields = ['registration', 'matricula', 'matrícula', 'employeeId', 'employee_id', 'id', 'code', 'codigo'];
  const documentFields = ['document', 'documento', 'cpf', 'cnpj', 'documentNumber', 'document_number', 'ssn', 'taxId', 'tax_id'];
  const notesFields = ['notes', 'observacoes', 'observações', 'obs', 'comments', 'description', 'desc'];

  // Função para encontrar o primeiro campo válido
  const findFirstValidField = (fields: string[]) => {
    for (const field of fields) {
      if (item[field] !== undefined && item[field] !== null && item[field] !== '') {
        return item[field];
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
    notes: findFirstValidField(notesFields),
  };
}
