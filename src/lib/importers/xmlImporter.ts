/**
 * Processador de arquivos XML para importação de usuários
 */

import { UserImportData } from './userImporter';

/**
 * Processa um arquivo XML
 */
export async function processXMLFile(file: File): Promise<UserImportData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Parsear o XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');
        
        // Verificar se houve erro no parsing
        const parseError = xmlDoc.getElementsByTagName('parsererror');
        if (parseError.length > 0) {
          throw new Error('Erro ao parsear XML: ' + parseError[0].textContent);
        }
        
        // Tentar encontrar elementos que representam usuários
        // Possíveis nomes de elementos para usuários
        const possibleUserElements = [
          'user', 'usuario', 'funcionario', 'employee', 'person', 'pessoa',
          'collaborator', 'colaborador', 'staff', 'member', 'item', 'record'
        ];
        
        let userElements: Element[] = [];
        
        // Tentar encontrar elementos de usuário
        for (const elementName of possibleUserElements) {
          const elements = xmlDoc.getElementsByTagName(elementName);
          if (elements.length > 0) {
            userElements = Array.from(elements);
            break;
          }
        }
        
        // Se não encontrou elementos específicos, tentar encontrar qualquer elemento que tenha atributos de usuário
        if (userElements.length === 0) {
          // Obter todos os elementos
          const allElements = xmlDoc.getElementsByTagName('*');
          
          // Filtrar elementos que têm atributos de usuário
          userElements = Array.from(allElements).filter(element => {
            // Verificar se o elemento tem atributos como nome, email, etc.
            const hasNameAttr = element.hasAttribute('name') || element.hasAttribute('nome');
            const hasEmailAttr = element.hasAttribute('email');
            const hasPhoneAttr = element.hasAttribute('phone') || element.hasAttribute('telefone');
            
            return hasNameAttr || hasEmailAttr || hasPhoneAttr;
          });
        }
        
        // Se ainda não encontrou elementos, tentar encontrar elementos que têm filhos com informações de usuário
        if (userElements.length === 0) {
          const allElements = xmlDoc.getElementsByTagName('*');
          
          userElements = Array.from(allElements).filter(element => {
            // Verificar se o elemento tem filhos como nome, email, etc.
            const children = Array.from(element.children);
            const hasNameChild = children.some(child => 
              ['name', 'nome', 'fullname', 'full_name'].includes(child.tagName.toLowerCase())
            );
            const hasEmailChild = children.some(child => 
              ['email', 'e-mail', 'mail'].includes(child.tagName.toLowerCase())
            );
            
            return hasNameChild || hasEmailChild;
          });
        }
        
        // Mapear elementos para o formato esperado
        const users = userElements.map(element => mapXMLElementToUserData(element));
        
        resolve(users);
      } catch (error) {
        console.error('Erro ao processar arquivo XML:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

/**
 * Mapeia um elemento XML para o formato UserImportData
 */
function mapXMLElementToUserData(element: Element): UserImportData {
  // Função para obter o valor de um atributo ou elemento filho
  const getValue = (names: string[]): string => {
    // Tentar obter de atributos
    for (const name of names) {
      if (element.hasAttribute(name)) {
        return element.getAttribute(name) || '';
      }
    }
    
    // Tentar obter de elementos filhos
    for (const name of names) {
      const childElement = element.querySelector(name);
      if (childElement && childElement.textContent) {
        return childElement.textContent.trim();
      }
    }
    
    return '';
  };
  
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
  
  // Mapear para o formato esperado
  return {
    name: getValue(nameFields),
    email: getValue(emailFields),
    phoneNumber: getValue(phoneFields),
    department: getValue(departmentFields),
    position: getValue(positionFields),
    admissionDate: getValue(admissionDateFields),
    registration: getValue(registrationFields),
    document: getValue(documentFields),
    notes: getValue(notesFields),
  };
}
