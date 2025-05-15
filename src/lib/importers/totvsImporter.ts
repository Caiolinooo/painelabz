/**
 * Processador de arquivos TOTVS para importação de usuários
 * Suporta formatos de exportação do TOTVS Protheus e RM
 */

import * as XLSX from 'xlsx';
import { UserImportData } from './userImporter';

/**
 * Processa um arquivo TOTVS
 */
export async function processTOTVSFile(file: File): Promise<UserImportData[]> {
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
          const users = jsonData.map(row => mapTOTVSDataToUserData(row));
          
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
          
          // Obter cabeçalhos
          const headers = lines[0].split(';').map(h => h.trim());
          
          // Processar linhas
          const users = lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
              const values = line.split(';').map(v => v.trim());
              const row: any = {};
              
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              
              return mapTOTVSDataToUserData(row);
            });
          
          resolve(users);
        } else if (fileName.endsWith('.txt')) {
          // Processar como TXT
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim() !== '');
          
          // Verificar se há linhas para processar
          if (lines.length === 0) {
            reject(new Error('Arquivo de texto vazio'));
            return;
          }
          
          // Verificar o formato do arquivo
          if (lines[0].includes(';')) {
            // Formato delimitado por ponto e vírgula
            const headers = lines[0].split(';').map(h => h.trim());
            
            const users = lines.slice(1)
              .filter(line => line.trim() !== '')
              .map(line => {
                const values = line.split(';').map(v => v.trim());
                const row: any = {};
                
                headers.forEach((header, index) => {
                  row[header] = values[index] || '';
                });
                
                return mapTOTVSDataToUserData(row);
              });
            
            resolve(users);
          } else {
            // Formato de largura fixa (comum em exportações TOTVS)
            // Definição dos campos com posições fixas
            // Estas posições podem variar dependendo da configuração do TOTVS
            const fieldDefinitions = [
              { name: 'matricula', start: 0, length: 10 },
              { name: 'nome', start: 10, length: 40 },
              { name: 'email', start: 50, length: 50 },
              { name: 'telefone', start: 100, length: 20 },
              { name: 'departamento', start: 120, length: 30 },
              { name: 'cargo', start: 150, length: 30 },
              { name: 'dataAdmissao', start: 180, length: 10 },
            ];
            
            const users = lines.map(line => {
              const row: any = {};
              
              fieldDefinitions.forEach(field => {
                if (line.length >= field.start + field.length) {
                  row[field.name] = line.substring(field.start, field.start + field.length).trim();
                } else {
                  row[field.name] = '';
                }
              });
              
              return mapTOTVSDataToUserData(row);
            });
            
            resolve(users);
          }
        } else {
          reject(new Error('Formato de arquivo não suportado para TOTVS'));
        }
      } catch (error) {
        console.error('Erro ao processar arquivo TOTVS:', error);
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
 * Mapeia dados do TOTVS para o formato UserImportData
 */
function mapTOTVSDataToUserData(row: any): UserImportData {
  // Campos possíveis para cada propriedade no TOTVS
  const nameFields = [
    'NOME', 'Nome', 'nome', 'NOMFUN', 'NomeFuncionario', 'NOME_FUNCIONARIO', 
    'NOME_COMPLETO', 'NomeCompleto', 'NOMECOMPLETO'
  ];
  const emailFields = [
    'EMAIL', 'Email', 'email', 'E-MAIL', 'E_MAIL', 'CORREIO', 'MAIL', 
    'EMAIL_CORP', 'EmailCorporativo', 'EMAIL_CORPORATIVO'
  ];
  const phoneFields = [
    'TELEFONE', 'Telefone', 'telefone', 'FONE', 'TEL', 'CELULAR', 'Celular', 
    'celular', 'TELFUN', 'TELEFONE_FUNCIONARIO', 'TELEFONE_CONTATO'
  ];
  const departmentFields = [
    'DEPARTAMENTO', 'Departamento', 'departamento', 'DEPTO', 'SETOR', 'Setor', 
    'setor', 'AREA', 'Área', 'area', 'CENTRO_CUSTO', 'CentroCusto', 'CC'
  ];
  const positionFields = [
    'CARGO', 'Cargo', 'cargo', 'FUNCAO', 'Função', 'funcao', 'CARFUN', 
    'CARGO_FUNCIONARIO', 'CARGO_FUNCAO', 'DESCRICAO_CARGO'
  ];
  const admissionDateFields = [
    'ADMISSAO', 'Admissao', 'admissao', 'DATA_ADMISSAO', 'DataAdmissao', 
    'dataAdmissao', 'DT_ADMISSAO', 'DTADMIS', 'DTADM'
  ];
  const registrationFields = [
    'MATRICULA', 'Matricula', 'matricula', 'MATFUN', 'MAT', 'CODIGO', 'Codigo', 
    'codigo', 'REGISTRO', 'Registro', 'registro', 'ID', 'Id', 'id'
  ];
  const documentFields = [
    'CPF', 'Cpf', 'cpf', 'DOCUMENTO', 'Documento', 'documento', 'DOC', 'NUMCPF', 
    'NUM_CPF', 'NUMERO_CPF', 'NUMERO_DOCUMENTO'
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
