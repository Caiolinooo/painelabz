import { generateEventXML, validateEventXML } from '../src/services/eSocialService';

function runXmlTest() {
  console.log('Testing S-2220 XML Generation...');

  const dadosEvento = {
    cnpj: '17.784.306/0001-89',
    cpf: '15415697764',
    indRetif: 1,
    nrRecibo: '',
    tpAmb: 2,
    dadosEspecificos: {
      nome: 'CAIO VALERIO GOULART CORREIA',
      tipoExame: 'admissional',
      data_realizacao: '2025-03-18',
      resultado: 'apto',
      medico_nome: 'Carolina Gil',
      medico_crm: '5201158279',
      medico_uf: 'RJ',
      medico_pcmso_nome: 'Heloana Antunes Sabino de Azevedo',
      medico_pcmso_crm: '52804584',
      medico_pcmso_uf: 'RJ',
      exames_realizados: [
        { nome: 'ACUIDADE VISUAL', data: '2025-03-17' },
        { nome: 'RAIO X COLUNA LOMBAR', data: '2025-03-17' },
        { nome: 'ELETROCARDIOGRAMA', data: '2025-03-17' }
      ],
      nome_clinica: 'Policlínica'
    }
  };

  const xml = generateEventXML('S-2220', dadosEvento);
  console.log('\n--- Generated XML ---\n');
  console.log(xml);
  console.log('\n---------------------\n');

  const validation = validateEventXML(xml);
  console.log('Validation results:', validation);

  if (xml.includes('<respMonit>') && xml.includes('<exame>')) {
    console.log('✅ Success: XML contains <respMonit> and <exame> tags.');
  } else {
    console.log('❌ Failure: XML is missing <respMonit> or <exame> tags.');
  }
}

runXmlTest();
