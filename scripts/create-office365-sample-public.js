/**
 * Script para criar um arquivo de exemplo do Office 365 para testes
 * Este script gera um arquivo Excel com dados de exemplo para testar a importação
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Criar um novo workbook
const wb = XLSX.utils.book_new();

// Definir os cabeçalhos (campos) para o template
const headers = [
  'Nome Completo',
  'Email',
  'Telefone',
  'Departamento',
  'Cargo',
  'Data de Admissão',
  'Matrícula',
  'CPF',
  'Observações'
];

// Criar dados de exemplo (10 funcionários)
const exampleData = [];

const departamentos = ['TI', 'RH', 'Financeiro', 'Marketing', 'Vendas'];
const cargos = ['Analista', 'Gerente', 'Coordenador', 'Assistente', 'Diretor'];

for (let i = 1; i <= 10; i++) {
  const nome = `Funcionário Teste ${i}`;
  const email = `funcionario.teste${i}@exemplo.com`;
  const telefone = `+55219${Math.floor(1000 + Math.random() * 9000)}${Math.floor(1000 + Math.random() * 9000)}`;
  const departamento = departamentos[Math.floor(Math.random() * departamentos.length)];
  const cargo = cargos[Math.floor(Math.random() * cargos.length)];
  
  // Gerar data de admissão aleatória nos últimos 5 anos
  const dataAdmissao = new Date();
  dataAdmissao.setFullYear(dataAdmissao.getFullYear() - Math.floor(Math.random() * 5));
  dataAdmissao.setMonth(Math.floor(Math.random() * 12));
  dataAdmissao.setDate(Math.floor(1 + Math.random() * 28));
  
  const dataFormatada = `${dataAdmissao.getDate().toString().padStart(2, '0')}/${(dataAdmissao.getMonth() + 1).toString().padStart(2, '0')}/${dataAdmissao.getFullYear()}`;
  
  const matricula = Math.floor(10000 + Math.random() * 90000).toString();
  const cpf = `${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}`;
  
  exampleData.push([
    nome,
    email,
    telefone,
    departamento,
    cargo,
    dataFormatada,
    matricula,
    cpf,
    `Funcionário de teste para importação #${i}`
  ]);
}

// Combinar cabeçalhos e dados de exemplo
const worksheetData = [headers, ...exampleData];

// Criar a planilha
const ws = XLSX.utils.aoa_to_sheet(worksheetData);

// Definir larguras de coluna
const colWidths = [
  { wch: 25 }, // Nome Completo
  { wch: 30 }, // Email
  { wch: 20 }, // Telefone
  { wch: 20 }, // Departamento
  { wch: 20 }, // Cargo
  { wch: 15 }, // Data de Admissão
  { wch: 10 }, // Matrícula
  { wch: 15 }, // CPF
  { wch: 40 }  // Observações
];

ws['!cols'] = colWidths;

// Adicionar a planilha ao workbook
XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');

// Definir o caminho para salvar o arquivo
const templateDir = path.join(__dirname, '..', 'public', 'templates');
const templatePath = path.join(templateDir, 'office365-sample-data.xlsx');

// Garantir que o diretório existe
if (!fs.existsSync(templateDir)) {
  fs.mkdirSync(templateDir, { recursive: true });
}

// Salvar o arquivo
XLSX.writeFile(wb, templatePath);

console.log(`Arquivo de exemplo criado: ${templatePath}`);
