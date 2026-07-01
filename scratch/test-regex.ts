const texto = `Médico Responsável pelo PCMSO,
Drº Heloana Antunes Sabino de Azevedo
CRM-RJ: 52.80458-4 | RQE: 27599 a ra
Av. Nossa Senhora da Glória, nº 2987 - 301 E D% Os
Cavaleiros - Macaé / RJ SE RV TÇOS
Telefone: (22) 3717-1170
ATESTADO DE SAÚDE OCUPACIONAL s22769
NOME: > TCAIO VALERIO GOULART CORREIA.
: | AGUAS BRASILEIRAS SERVICOS E CONSULTORIA EM ATIVIDADES "
| EMPRESA: ABETINAS TOSA CNPJ: | 17.784.306/0007-89 |
FUNÇÃO — ANALISTA DE SUPORTE ABZ BASE ]
CPF: 15415697764 RG/ORGÃO: 28.356.467-2 DIC. DN: 1112/1995)
Em cumprimento aos 1º$ e 3º$ do Artigo 168 da Lei nº 6.514, Portaria 3.214/78, Portaria 3,164/82, Portaria 12/6234/04 e 6/96 da NR-7eositens =|
30.1.1, 30.2.1, 30.3.1.1, 30.3.2.1 e os Quadros 1 da NR-30 do Ministério do Trabalho, para fins de exame: Admissional J
RISCOS OCUPACIONAIS: . "
ERGONÔMICO Postura Inadequada, Arranjo Físico, Movimentos Repetítivos de Mãos e Dedos
ACIDENTE Queda de Pessoa com Diferença de Nivel ]
FA õ5eunsussaavuvuúaiAvRw DD Wo [gos |
| owarto TT A NO-APUCÁVEL— |
oo NAO APLICÁVEL — |
ERRA PORRA Ao pro | IIOAPLCÁVEC |
[Eee DE RESGATE ERAETTRA Ato Tanto | IOAPLCAVEC |
oo NIOAPUCAVEL |
[PARA TRABALHAR ER TESE DFRERORE OR [no — | Midosucíve |
PROCEDIMENTOS | DATA PROCEDIMENTOS [1 PATA
ACUIDADE VISUAL 17/03/2025 RAIO X COLUNA LOMBAR 17/03/2025
ELETROCARDIOGRAMA 17/03/2025 TIPO E FATOR RH O fosinivo 17/03/2025
EXAME CLINICO - ASO 17/03/2025
GLICOSE 17/03/2025
HEMOGRAMA COMPLETO 17/03/2025
Tá
Médico Examinador p
EESC [je Ceroama Gm
iclini te. sn- 3L117A - Hospital Vitoria Ag RM:
FZ Policlínica | RAR rAsa As RIOA topa a: IM: 52011 5627.0
ua Evaristo da Veiga, 55 - 20º andar - Cenvo - Rio de Janeiro / Ru Assinatura / Carimbo Módico Examinador
Assratrs do candanieta) conboradoo) " ÇA ASO
ES 1
`;

function testarRegexes() {
  console.log("=== TESTANDO DATAS ===");
  const dataRealizacaoRegex = /(?:data(?:\s+da)?\s+conclusão|data\s+conclusao|realização|realizacao|concluído|concluido|realizado|emissão|emissao|data)[:\s]*(\d{2}\s+(?:[A-Z]{3,}\.?|[A-Za-zçãõ-]+)\s+\d{4}|\d{2}\/\d{2}\/\d{4})/i;
  const matchData = texto.match(dataRealizacaoRegex);
  console.log("Match data geral:", matchData ? matchData[0] : "null", "Grupo 1:", matchData ? matchData[1] : "null");

  const datasEncontradas = texto.match(/\d{2}\/\d{2}\/\d{4}|\d{2}\s+(?:JAN|FEB|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z\.]*\s+\d{4}/gi);
  console.log("Todas as datas encontradas:", datasEncontradas);

  console.log("\n=== TESTANDO CRM ===");
  const crmRegexes = [
    /(?:CRM|IM|RM|REGISTRO)\s*[-/]?\s*(?:[A-Z]{2})?\s*[:|I\s-]*\s*([\d.\s-]+)/i,
    /(?:CRM|IM|RM)\s*(?:-?\s*[A-Z]{2})?\s*[:|I\s-]*\s*([\d.\s-]+)/i
  ];
  for (const regex of crmRegexes) {
    const matches = [...texto.matchAll(new RegExp(regex, 'gi'))];
    console.log("Regex:", regex);
    matches.forEach(m => {
      console.log(`  Match: "${m[0]}" -> CRM capturado: "${m[1].trim()}"`);
    });
  }

  console.log("\n=== TESTANDO MÉDICO ===");
  const medicoRegexes = [
    /(?:Dr\.?|Dra\.?|Drº|Drª|Médico\s+Examinador|Médico\s+Responsável)\s+([A-ZÀ-ÖØ-öø-ÿ\s\[\]]+?)(?=\r?\n|CRM|IM|RM|CPF|\(|:|$)/gi
  ];
  for (const regex of medicoRegexes) {
    const matches = [...texto.matchAll(new RegExp(regex, 'gi'))];
    console.log("Regex:", regex);
    matches.forEach(m => {
      console.log(`  Match: "${m[0]}" -> Nome capturado: "${m[1].trim()}"`);
    });
  }

  console.log("\n=== TESTANDO CNPJ CLINICA ===");
  const cnpjRegex = /(?:CNPJ|C\.N\.P\.J)\s*[:|I\s-]*\s*(\d{2}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*\/\s*\d{4}\s*-\s*\d{2}|\d{14})/i;
  const cnpjMatch = texto.match(cnpjRegex);
  console.log("CNPJ Match:", cnpjMatch ? cnpjMatch[0] : "null", "CNPJ capturado:", cnpjMatch ? cnpjMatch[1] : "null");
}

function extrairDadosASODoTexto(texto: string): Record<string, any> {
  const upper = texto.toUpperCase();
  const dados: Record<string, any> = {};

  // 1. Tipo de Exame
  let tipo_exame = 'periodico';
  if (/admissional/i.test(texto)) tipo_exame = 'admissional';
  else if (/demissional/i.test(texto)) tipo_exame = 'demissional';
  else if (/retorno/i.test(texto)) tipo_exame = 'retorno';
  else if (/mudança\s+de\s+função|mudanca\s+de\s+funcao/i.test(texto)) tipo_exame = 'mudanca_funcao';
  dados.tipo_exame = tipo_exame;

  // 2. Resultado
  let resultado = 'apto';
  if (/inapto/i.test(texto)) resultado = 'inapto';
  else if (/apto\s+condicional/i.test(texto)) resultado = 'apto_condicional';
  dados.resultado = resultado;

  // 3. Data de Realização
  let data_realizacao: string | null = null;
  const mesesBr: Record<string, string> = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12',
    'JANEIRO': '01', 'FEVEREIRO': '02', 'MARCO': '03', 'MARÇO': '03', 'ABRIL': '04',
    'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08', 'SETEMBRO': '09',
    'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
  };

  const converterDataBr = (dia: string, mesStr: string, ano: string): string => {
    const cleanMes = mesStr.toUpperCase().replace(/\./g, '').trim();
    const mes = mesesBr[cleanMes] || '01';
    return `${ano}-${mes}-${dia.padStart(2, '0')}`;
  };

  const lines = texto.split('\n');
  
  // Tentar encontrar data nas linhas de conclusão ou realização primeiro
  for (const line of lines) {
    if (/(?:conclusão|conclusao|realização|realizacao|emissão|emissao|data\s+conclus|data\s+realiz|aso)/i.test(line)) {
      const m1 = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m1) {
        data_realizacao = `${m1[3]}-${m1[2]}-${m1[1]}`;
        break;
      }
      const m2 = line.match(/(\d{2})\s*(?:DE\s+)?([A-Za-zçãõ.]+)\.?\s*(?:DE\s+)?(\d{4})/i);
      if (m2) {
        data_realizacao = converterDataBr(m2[1], m2[2], m2[3]);
        break;
      }
    }
  }

  if (!data_realizacao) {
    for (const line of lines) {
      if (/exame|clinico|clínico/i.test(line)) {
        const m = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) {
          data_realizacao = `${m[3]}-${m[2]}-${m[1]}`;
          break;
        }
      }
    }
  }

  if (!data_realizacao) {
    const dataMatches = [...texto.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
    if (dataMatches.length > 0) {
      const lastMatch = dataMatches[dataMatches.length - 1];
      data_realizacao = `${lastMatch[3]}-${lastMatch[2]}-${lastMatch[1]}`;
    }
  }

  if (!data_realizacao) {
    const textDataMatch = texto.match(/(\d{2})\s*(?:DE\s+)?([A-Za-zçãõ.]+)\.?\s*(?:DE\s+)?(\d{4})/i);
    if (textDataMatch) {
      data_realizacao = converterDataBr(textDataMatch[1], textDataMatch[2], textDataMatch[3]);
    }
  }

  dados.data_realizacao = data_realizacao;

  // 4 & 5. Médicos e CRMs (Pareamento por proximidade)
  const crmRegex = /(?:CRM|IM|RM|REGISTRO)\s*(?:-?\s*([A-Z]{2}))?\s*[:|I\s-]*\s*([\d.\s-]+)/gi;
  const crmMatches = [...texto.matchAll(crmRegex)];
  
  const medicosEncontrados: { nome: string; crm: string }[] = [];

  crmMatches.forEach(match => {
    const crmVal = match[2].trim();
    const crmDigits = crmVal.replace(/[^\d]/g, '');
    
    if (crmDigits.length < 4) return;

    const index = match.index || 0;
    const textoAntes = texto.substring(Math.max(0, index - 250), index);
    const linhasAntes = textoAntes.split('\n').map(l => l.trim()).filter(Boolean);
    
    let nomeEncontrado = '';
    for (let i = linhasAntes.length - 1; i >= 0; i--) {
      const linha = linhasAntes[i];

      if (/hospital|policlínica|policlinica|clínica|clinica|unidade|av\.|rua|telefone|fone|cnpj|cep|sac|atendimento|crm|rm:|im:|registro|coordenador/i.test(linha)) {
        continue;
      }

      let linhaLimpa = linha.replace(/^(?:Dra?|DRA?|Médico\s+Examinador|Médico\s+Responsável|Assinatura\s*\/?[Cc]arimbo\s*Médico\s*Examinador)[^a-zA-ZÀ-ÖØ-öø-ÿ]*/i, '').trim();

      linhaLimpa = linhaLimpa
        .replace(/[\[\]|:_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      linhaLimpa = linhaLimpa.replace(/^[A-Z]{2,4}\s+(?:je|ja|jo|de|da|do)\s+/i, '');

      if (linhaLimpa.length > 5 && 
          linhaLimpa.split(' ').length >= 2 &&
          !/\d/.test(linhaLimpa)) {
        nomeEncontrado = linhaLimpa;
        break;
      }
    }

    if (nomeEncontrado) {
      medicosEncontrados.push({
        nome: nomeEncontrado,
        crm: crmVal.replace(/[.\s]/g, '')
      });
    }
  });

  console.log("Médicos e CRMs pareados encontrados:", medicosEncontrados);

  let medico_nome: string | null = null;
  let medico_crm: string | null = null;

  if (medicosEncontrados.length > 0) {
    const exam = medicosEncontrados[medicosEncontrados.length - 1];
    medico_nome = exam.nome;
    medico_crm = exam.crm;
  }

  dados.medico_nome = medico_nome;
  dados.medico_crm = medico_crm;

  // 6. CNPJ Clínica
  let cnpj_clinica: string | null = null;
  const cnpjRegex = /(?:CNPJ|C\.N\.P\.J)\s*[:|I\s-]*\s*(\d{2}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*\/\s*\d{4}\s*-\s*\d{2}|\d{14})/i;
  const cnpjMatch = texto.match(cnpjRegex);
  if (cnpjMatch) {
    cnpj_clinica = cnpjMatch[1].replace(/[^\d]/g, '');
  }
  dados.cnpj_clinica = cnpj_clinica;

  // 7. Nome da Clínica
  let nome_clinica: string | null = null;
  const clinicaMatch = texto.match(/(?:Clínica|Clinica|Centro\s+Médico|Laboratório|Laboratorio)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
  if (clinicaMatch) {
    nome_clinica = clinicaMatch[1].trim().split('\n')[0];
  }
  dados.nome_clinica = nome_clinica;

  return dados;
}

console.log("=== EXTRAÇÃO COMPLETA ===");
const resultado = extrairDadosASODoTexto(texto);
console.log(resultado);
testarRegexes();
