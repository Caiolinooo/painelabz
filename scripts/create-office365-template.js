/**
 * Script para criar um template de importação de funcionários para Office 365
 * Este script gera um arquivo Excel com cabeçalhos e exemplos para importação
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

// Criar alguns dados de exemplo
const exampleData = [
  [
    'João Silva',
    'joao.silva@exemplo.com',
    '+5521999999999',
    'TI',
    'Desenvolvedor',
    '01/01/2023',
    '12345',
    '123.456.789-00',
    'Funcionário exemplar'
  ],
  [
    'Maria Oliveira',
    'maria.oliveira@exemplo.com',
    '+5521888888888',
    'RH',
    'Analista de RH',
    '15/02/2023',
    '54321',
    '987.654.321-00',
    'Contratada recentemente'
  ]
];

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
const templatePath = path.join(templateDir, 'office365-import-template.xlsx');

// Garantir que o diretório existe
if (!fs.existsSync(templateDir)) {
  fs.mkdirSync(templateDir, { recursive: true });
}

// Salvar o arquivo
XLSX.writeFile(wb, templatePath);

console.log(`Template criado com sucesso: ${templatePath}`);

// Criar também uma versão para o diretório temp (para testes)
const tempPath = path.join(__dirname, '..', 'temp', 'office365-import-template.xlsx');
XLSX.writeFile(wb, tempPath);
console.log(`Template de teste criado: ${tempPath}`);
