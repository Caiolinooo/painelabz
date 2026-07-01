import { generateEventXML } from '../src/services/eSocialService';

const eventData = {
  cpf: '37030265882',
  cnpj: '',
  tpAmb: 2,
  indRetif: 1,
  dadosEspecificos: {
    tipoExame: 'periodico',
    dataRealizacao: '2026-05-04',
    resultado: 'apto',
    medico_nome: 'Thalia Leal Dibo',
    medico_crm: '521311816',
    medico_uf: 'RJ',
    exames_realizados: [],
    nome_clinica: 'Policlínica'
  }
};

const xml = generateEventXML('S-2220', eventData);
console.log("Generated XML:");
console.log(xml);
