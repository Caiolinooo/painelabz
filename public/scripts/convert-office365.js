/**
 * Script para converter uma planilha do Office 365 para o formato de importação
 * Este script pode ser executado no navegador para converter planilhas do Office 365
 */

// Função para converter arquivo
async function convertOffice365File(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        
        // Carregar a biblioteca XLSX
        if (!window.XLSX) {
          // Se a biblioteca não estiver carregada, carregá-la dinamicamente
          await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        }
        
        // Ler o arquivo
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Obter a primeira planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Mapear campos
        const mappedData = jsonData.map(row => {
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
        
        // Criar novo workbook com os dados mapeados
        const newWorkbook = XLSX.utils.book_new();
        const newWorksheet = XLSX.utils.json_to_sheet(validData);
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Funcionários');
        
        // Gerar arquivo
        const outputData = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        
        // Criar Blob e URL
        const blob = new Blob([outputData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        
        resolve({
          url,
          filename: `${file.name.replace(/\.[^/.]+$/, '')}_convertido.xlsx`,
          totalRecords: jsonData.length,
          validRecords: validData.length
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// Função para carregar script dinamicamente
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Exportar função para uso global
window.convertOffice365File = convertOffice365File;
