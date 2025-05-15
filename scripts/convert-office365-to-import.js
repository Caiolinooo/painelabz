/**
 * Script para converter uma planilha do Office 365 para o formato de importação
 * Este script lê um arquivo Excel do Office 365 e o converte para o formato esperado pelo sistema
 * 
 * Uso: node scripts/convert-office365-to-import.js <caminho-do-arquivo>
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Verificar argumentos
if (process.argv.length < 3) {
  console.error('Uso: node scripts/convert-office365-to-import.js <caminho-do-arquivo>');
  process.exit(1);
}

// Obter caminho do arquivo
const inputFilePath = process.argv[2];

// Verificar se o arquivo existe
if (!fs.existsSync(inputFilePath)) {
  console.error(`Arquivo não encontrado: ${inputFilePath}`);
  process.exit(1);
}

// Verificar extensão do arquivo
const fileExt = path.extname(inputFilePath).toLowerCase();
if (fileExt !== '.xlsx' && fileExt !== '.xls') {
  console.error('O arquivo deve ser um arquivo Excel (.xlsx ou .xls)');
  process.exit(1);
}

try {
  // Ler o arquivo
  console.log(`Lendo arquivo: ${inputFilePath}`);
  const workbook = XLSX.readFile(inputFilePath);
  
  // Obter a primeira planilha
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Lidos ${data.length} registros`);
  
  // Mapear campos
  const mappedData = data.map(row => {
    // Função para encontrar o primeiro campo válido
    const findField = (fields) => {
      for (const field of fields) {
        if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
          return row[field];
        }
      }
      return '';
    };
    
    // Mapear campos comuns do Office 365
    const nameFields = ['Nome Completo', 'Nome', 'Full Name', 'Name', 'nome completo', 'DisplayName', 'Nome de Exibição'];
    const emailFields = ['Email', 'E-mail', 'E-Mail', 'email', 'e-mail', 'Mail', 'EmailAddress', 'UserPrincipalName'];
    const phoneFields = ['Telefone', 'Phone', 'Celular', 'Mobile', 'telefone', 'celular', 'MobilePhone', 'BusinessPhones'];
    const departmentFields = ['Departamento', 'Department', 'Setor', 'Area', 'departamento', 'setor'];
    const positionFields = ['Cargo', 'Position', 'Função', 'Job Title', 'cargo', 'função', 'funcao', 'JobTitle'];
    
    return {
      name: findField(nameFields),
      email: findField(emailFields),
      phoneNumber: findField(phoneFields),
      department: findField(departmentFields),
      position: findField(positionFields)
    };
  });
  
  // Filtrar registros inválidos (sem nome ou sem contato)
  const validData = mappedData.filter(user => 
    user.name && (user.email || user.phoneNumber)
  );
  
  console.log(`Mapeados ${validData.length} registros válidos`);
  
  // Criar novo workbook com os dados mapeados
  const newWorkbook = XLSX.utils.book_new();
  const newWorksheet = XLSX.utils.json_to_sheet(validData);
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Funcionários');
  
  // Definir caminho de saída
  const outputFilePath = path.join(
    path.dirname(inputFilePath),
    `${path.basename(inputFilePath, path.extname(inputFilePath))}_convertido${path.extname(inputFilePath)}`
  );
  
  // Salvar arquivo
  XLSX.writeFile(newWorkbook, outputFilePath);
  
  console.log(`Arquivo convertido salvo em: ${outputFilePath}`);
  
} catch (error) {
  console.error('Erro ao processar arquivo:', error);
  process.exit(1);
}
