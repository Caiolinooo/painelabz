/**
 * Test script for ASO OCR extraction improvements.
 * Run: npx tsx scratch/test-ocr-aso.ts
 */

// ===== MESES_BR dictionary (copied from ocr-processor.ts) =====
const MESES_BR: Record<string, string> = {
  'JAN': '01', 'JANEIRO': '01',
  'FEV': '02', 'FEVEREIRO': '02',
  'MAR': '03', 'MARCO': '03', 'MARÇO': '03',
  'ABR': '04', 'ABRIL': '04',
  'MAI': '05', 'MAIO': '05',
  'JUN': '06', 'JUNHO': '06',
  'JUL': '07', 'JULHO': '07',
  'AGO': '08', 'AGOSTO': '08',
  'SET': '09', 'SETEMBRO': '09',
  'OUT': '10', 'OUTUBRO': '10',
  'NOV': '11', 'NOVEMBRO': '11',
  'DEZ': '12', 'DEZEMBRO': '12',
};

const PALAVRAS_DATA_PROXIMA = [
  'conclusao', 'conclusão', 'realizacao', 'realização',
  'realizado', 'realizada', 'data', 'exame', 'clinico', 'clínico',
  'aso', 'procedimentos', 'procedimento', 'emissao', 'emissão',
];

function converterDataTexto(dia: string, mesStr: string, ano: string): string | null {
  const cleanMes = mesStr.toUpperCase().replace(/\./g, '').trim();
  const mes = MESES_BR[cleanMes];
  if (!mes) return null;
  const d = dia.padStart(2, '0');
  return `${ano}-${mes}-${d}`;
}

function extrairDataDoTexto(texto: string): string | null {
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    if (PALAVRAS_DATA_PROXIMA.some(p => linha.toLowerCase().includes(p))) {
      const m1 = linha.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m1) {
        const [_, d, mes, a] = m1;
        if (parseInt(d) >= 1 && parseInt(d) <= 31 && parseInt(mes) >= 1 && parseInt(mes) <= 12) {
          return `${a}-${mes}-${d}`;
        }
      }
      const m2 = linha.match(/(\d{1,2})\s*(?:DE\s+)?([A-Za-zÀ-ÖØ-öø-ÿçãõ]+)\.?\s*(?:DE\s+)?(\d{4})/i);
      if (m2) {
        const converted = converterDataTexto(m2[1], m2[2], m2[3]);
        if (converted) return converted;
      }
    }
  }

  const dataNumerica = [...texto.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
  if (dataNumerica.length > 0) {
    const validas = dataNumerica
      .map(m => ({ d: parseInt(m[1]), mes: parseInt(m[2]), a: parseInt(m[3]), raw: m }))
      .filter(x => x.d >= 1 && x.d <= 31 && x.mes >= 1 && x.mes <= 12 && x.a >= 2020 && x.a <= 2030);

    if (validas.length > 0) {
      validas.sort((a, b) => b.a - a.a || b.mes - a.mes || b.d - a.d);
      const best = validas[0];
      return `${best.a}-${best.mes.toString().padStart(2, '0')}-${best.d.toString().padStart(2, '0')}`;
    }
  }

  const dataTexto = [...texto.matchAll(/(\d{1,2})\s*(?:DE\s+)?([A-Za-zÀ-ÖØ-öø-ÿçãõ]+)\.?\s*(?:DE\s+)?(\d{4})/gi)];
  if (dataTexto.length > 0) {
    for (const m of dataTexto) {
      const converted = converterDataTexto(m[1], m[2], m[3]);
      if (converted && parseInt(m[3]) >= 2020 && parseInt(m[3]) <= 2030) return converted;
    }
  }

  return null;
}

function normalizarCRM(raw: string): string {
  let crm = raw.trim();
  crm = crm.replace(/\s+/g, '');
  crm = crm.replace(/[I|l|]/g, '1').trim();
  crm = crm.replace(/\.0$/, '');
  crm = crm.replace(/[^\d]/g, '');
  if (crm.length >= 4 && crm.length <= 15) {
    return crm;
  }
  return crm;
}

function extrairCRMsDoTexto(texto: string): { crm: string; contexto: string; indice: number }[] {
  const crmPatterns = [
    /(?:CRM|C\.R\.M\.|RM|IM|REGISTRO)\s*(?:-?\s*([A-Z]{2}))?\s*[:|I\-\s]*\s*([\d][\d.\s-]{4,}\d)/gi,
    /(?:CRM|C\.R\.M\.)\s*[:|I\-\s]*\s*(\d[\d.\s]{4,}\d)/gi,
  ];

  const resultados: { crm: string; contexto: string; indice: number }[] = [];

  for (const pattern of crmPatterns) {
    const matches = [...texto.matchAll(pattern)];
    for (const m of matches) {
      const crmRaw = m[2] || m[1] || m[0].replace(/^.*?(CRM|C\.R\.M\.|RM|IM|REGISTRO)\s*[:|\-]*\s*/i, '');
      const crmNormalizado = normalizarCRM(crmRaw);
      if (crmNormalizado.length < 4) continue;

      const start = Math.max(0, (m.index || 0) - 60);
      const end = Math.min(texto.length, (m.index || 0) + (m[0]?.length || 0) + 60);
      const contexto = texto.substring(start, end).replace(/\n/g, ' ').trim();

      resultados.push({
        crm: crmNormalizado,
        contexto,
        indice: m.index || 0,
      });
    }
  }

  return resultados;
}

function selecionarCRMMaisProximoDeExaminador(
  texto: string,
  crms: { crm: string; contexto: string; indice: number }[]
): { crm: string; indice: number } | null {
  if (crms.length === 0) return null;
  if (crms.length === 1) return { crm: crms[0].crm, indice: crms[0].indice };

  const keywords = ['examinador', 'assinatura', 'carimbo', 'médico examinador', 'medico examinador'];

  const scored = crms.map(item => {
    const idx = item.indice;
    let bestDist = Infinity;

    for (const kw of keywords) {
      const kwIdx = texto.toLowerCase().indexOf(kw);
      if (kwIdx >= 0) {
        const dist = Math.abs(idx - kwIdx);
        if (dist < bestDist) bestDist = dist;
      }
    }

    return { ...item, distance: bestDist };
  });

  const filtered = scored.filter(item => {
    const ctxLower = item.contexto.toLowerCase();
    if (ctxLower.includes('coordenador') || ctxLower.includes('responsavel') || ctxLower.includes('pcmso')) {
      return false;
    }
    return true;
  });

  const candidates = filtered.length > 0 ? filtered : scored;
  candidates.sort((a, b) => a.distance - b.distance);
  return { crm: candidates[0].crm, indice: candidates[0].indice };
}

function extrairResultado(texto: string): string {
  const linhas = texto.split('\n');

  let aptoCheckbox = false;
  let inaptoCheckbox = false;
  let condicionalCheckbox = false;

  for (const linha of linhas) {
    const upperLinha = linha.toUpperCase();

    if (/\[X\]\s*APTO|\(X\)\s*APTO|\[\*\]\s*APTO|APTO\s*\[X\]|APTO\s*\(X\)/i.test(upperLinha)) {
      aptoCheckbox = true;
    }
    if (/\[X\]\s*INAPTO|\(X\)\s*INAPTO|\[\*\]\s*INAPTO|INAPTO\s*\[X\]|INAPTO\s*\(X\)/i.test(upperLinha)) {
      inaptoCheckbox = true;
    }
    if (/\[X\]\s*APTO\s+CONDICIONAL|\(X\)\s*APTO\s+CONDICIONAL/i.test(upperLinha)) {
      condicionalCheckbox = true;
    }
    if (/\[\s*\]\s*APTO/.test(upperLinha)) aptoCheckbox = false;
    if (/\[\s*\]\s*INAPTO/.test(upperLinha)) inaptoCheckbox = false;
  }

  if (condicionalCheckbox) return 'apto_condicional';
  if (inaptoCheckbox) return 'inapto';
  if (aptoCheckbox) return 'apto';

  for (let i = 0; i < linhas.length; i++) {
    const upper = linhas[i].toUpperCase();

    if (/^(?:RESULTADO|CONCLUSÃO|CONCLUSAO|PARECER|DIAGNÓSTICO|DIAGNOSTICO)\s*[:]\s*(APTO|INAPTO)/i.test(upper)) {
      const m = upper.match(/:\s*(APTO|INAPTO)/i);
      if (m) {
        const val = m[1].toLowerCase();
        if (val === 'inapto') return 'inapto';
        return 'apto';
      }
    }
  }

  let encontrouInapto = false;
  let encontrouApto = false;

  for (let i = 0; i < Math.min(linhas.length, 25); i++) {
    const upperLinha = linhas[i].toUpperCase();

    if (/INAPTO/.test(upperLinha)) {
      const isFalsePositive =
        /NAO APLICAVEL|NÃO APLICÁVEL|NAO\s+SE\s+APLICA|NÃO\s+SE\s+APLICA|EM\s+CASO\s+DE\s+INAPTIDÃO|EM\s+CASO\s+DE\s+INAPTIDAO|DOENÇA|DOENCA|ACIDENTE|INAPTIDÃO/i.test(upperLinha);

      if (!isFalsePositive && upperLinha.length < 100) {
        encontrouInapto = true;
      }
    }

    if (/(?:^|\s)APTO(?:\s|$)/i.test(upperLinha) && !/INAPTO/.test(upperLinha)) {
      const isFalsePositive =
        /NAO APLICAVEL|NÃO APLICÁVEL/i.test(upperLinha);

      if (!isFalsePositive && upperLinha.length < 100) {
        encontrouApto = true;
      }
    }
  }

  const aptoCondicional = /APTO\s+CONDICIONAL/i.test(texto.substring(0, 2000));
  if (aptoCondicional) return 'apto_condicional';

  if (encontrouInapto) return 'inapto';
  if (encontrouApto) return 'apto';

  return 'apto';
}

function extrairNomeMedico(texto: string, crmIndice: number | null): string {
  const lines = texto.split('\n');

  let searchRadiusStart = 0;
  let searchRadiusEnd = lines.length;

  if (crmIndice !== null) {
    const crmLineIdx = texto.substring(0, crmIndice).split('\n').length - 1;
    searchRadiusStart = Math.max(0, crmLineIdx - 4);
    searchRadiusEnd = Math.min(lines.length, crmLineIdx + 1);
  }

  for (let i = searchRadiusEnd - 1; i >= searchRadiusStart; i--) {
    const linha = lines[i].trim();
    if (!linha) continue;

    if (/(?:hospital|policlínica|policlinica|clínica|clinica|unidade|av\.|rua|telefone|fone|cnpj|cep|sac|atendimento|coordenador|responsável|responsavel|pcmso|telefone|whatsapp|site|www|@)/i.test(linha)) {
      continue;
    }
    if (/^\d/.test(linha)) continue;

    let linhaLimpa = linha
      .replace(/^Médico\s+Examinador[\s:]*|^Medico\s+Examinador[\s:]*|^Assinatura[\s\/]*Carimbo[\s]*M[ée]dico[\s]*Examinador[\s:]*/i, '')
      .replace(/^(?:Dra\.?\s*[ºª]?\s*|Dr\.?\s*[ºª]?\s*|Drª\s*|Drº\s*|DRA\.?\s*|DR\.?\s*)/i, '')
      .replace(/[\[\]|_:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (linhaLimpa.length > 5 && linhaLimpa.split(' ').length >= 2 && !/\d/.test(linhaLimpa)) {
      return linhaLimpa;
    }
  }

  const medicoMatch = texto.match(/(?:Dr\.?\s*[ºª]?\s*|Dra\.?\s*[ºª]?\s*|Drª\s*|Drº\s*)([A-Za-zÀ-ÖØ-öø-ÿçãõ\s]{10,60})(?:\r?\n|CRM|$)/i);
  if (medicoMatch) {
    return medicoMatch[1].trim();
  }

  return '';
}

function eLinhaDeExameValida(linha: string): boolean {
  const l = linha.toLowerCase();
  if (/nascimento|nasc\.?|admissão|admissao|emissão|emissao|cpf|cnpj|rg|resultado|conclusão|conclusao|médico|medico|crm|rqe|telefone|fone|empresa|função|funcao|setor|cargo|nome|colaborador|candidato/i.test(l)) {
    if (l.includes('clinico') || l.includes('clínico')) {
      return true;
    }
    return false;
  }
  return true;
}

function extrairExamesDoTexto(texto: string, dataAso: string | null): { nome: string; data: string }[] {
  const exames: { nome: string; data: string }[] = [];
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    const linhaLimpa = linha.trim();
    if (!linhaLimpa) continue;
    
    if (!eLinhaDeExameValida(linhaLimpa)) {
      continue;
    }
    
    if (/^(?:procedimentos|data|procedimento|exame|exames|\s*\|\s*)+$/i.test(linhaLimpa)) {
      continue;
    }

    const regexData = /(\d{2})\/(\d{2})\/(\d{2,4})/g;
    const matches = [...linhaLimpa.matchAll(regexData)];
    
    if (matches.length > 0) {
      let lastIndex = 0;
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const matchIndex = match.index || 0;
        
        let procNome = linhaLimpa.substring(lastIndex, matchIndex)
          .replace(/[|;\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        procNome = procNome.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿçãõ]+/, '').replace(/[^A-Za-zÀ-ÖØ-öø-ÿçãõ\s\-]+$/, '').trim();

        const dia = match[1];
        const mes = match[2];
        let anoRaw = match[3];
        let anoClean = anoRaw.replace(/O/g, '0').replace(/S/g, '5').replace(/[Il]/g, '1').replace(/[^\d]/g, '');
        if (anoClean.length === 2) {
          anoClean = '20' + anoClean;
        }
        
        const dataFormatada = `${anoClean}-${mes}-${dia}`;
        
        if (procNome.length > 3 && procNome.split(' ').some(w => w.length > 2)) {
          exames.push({
            nome: procNome.toUpperCase(),
            data: dataFormatada
          });
        }
        
        lastIndex = matchIndex + match[0].length;
      }
    }
  }

  if (exames.length === 0) {
    const examesComuns = [
      'ACUIDADE VISUAL', 'ELETROCARDIOGRAMA', 'EXAME CLINICO', 'EXAME CLINICO - ASO',
      'GLICOSE', 'HEMOGRAMA', 'HEMOGRAMA COMPLETO', 'RAIO X COLUNA LOMBAR', 'RAIO X COLUNA',
      'RAIO X', 'TIPO E FATOR RH', 'AUDIOMETRIA', 'ESPIROMETRIA', 'ENCEFALOGRAMA', 'EEG', 'ECG'
    ];
    const textoLower = texto.toLowerCase();
    for (const exameNome of examesComuns) {
      if (textoLower.includes(exameNome.toLowerCase())) {
        exames.push({
          nome: exameNome,
          data: dataAso || new Date().toISOString().split('T')[0]
        });
      }
    }
  }

  const uniqueExames: { nome: string; data: string }[] = [];
  const seenNomes = new Set<string>();
  for (const ex of exames) {
    if (!seenNomes.has(ex.nome)) {
      seenNomes.add(ex.nome);
      uniqueExames.push(ex);
    }
  }

  return uniqueExames;
}

// ====================================================================
// REAL OCR TEXT FROM SCANNED ASO
// ====================================================================
const textoASOReal = `Médico Responsável pelo PCMSO,
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
| oo NAO APLICÁVEL — |
| ERRA PORRA Ao pro | IIOAPLCÁVEC |
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
icli te. sn- 3L117A - Hospital Vitoria Ag RM:
FZ Policlínica | RAR rAsa As RIOA topa a: IM: 52011 5627.0
ua Evaristo da Veiga, 55 - 20º andar - Cenvo - Rio de Janeiro / Ru Assinatura / Carimbo Módico Examinador
Assratrs do candanieta) conboradoo) " ÇA ASO
ES 1
`;

const textoSemOCRNoise = `Médico Responsável pelo PCMSO,
Dr Heloana Antunes Sabino de Azevedo
CRM-RJ: 52.80458-4 | RQE: 27599
Av. Nossa Senhora da Gloria, 2987 - 301
Cavaleiros - Macae / RJ
Telefone: (22) 3717-1170
ATESTADO DE SAUDE OCUPACIONAL
NOME: CAIO VALERIO GOULART CORREIA
EMPRESA: AGUAS BRASILEIRAS SERVICOS E CONSULTORIA
CNPJ: 17.784.306/0007-89
FUNCAO: ANALISTA DE SUPORTE
CPF: 15415697764 RG: 28.356.467-2
Exame: Admissional
PROCEDIMENTOS DATA
ACUIDADE VISUAL 17/03/2025
RAIO X COLUNA LOMBAR 17/03/2025
ELETROCARDIOGRAMA 17/03/2025
TIPO E FATOR RH 17/03/2025
EXAME CLINICO - ASO 17/03/2025
GLICOSE 17/03/2025
HEMOGRAMA COMPLETO 17/03/2025
RESULTADO: APTO
Médico Examinador
Dra. Mariana Costa Silva
CRM-RJ: 520115627-9
Policlinica Vitoria
Rua Evaristo da Veiga, 55 - 20 andar - Centro - Rio de Janeiro / RJ
`;

function cleanTextForTest(text: string): string {
  return text
    .replace(/[|¦\\]/g, 'I')
    .replace(/[‘’'`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[•·]/g, '.')
    .replace(/[©®™]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ====================================================================
// TESTS
// ====================================================================
function test(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.log(`  ❌ ${label} ${detail ? `-- ${detail}` : ''}`);
  }
}

function runTests() {
  console.log('\n========== TESTE EXTRAÇÃO OCR ASO ==========\n');

  // 1. Test with noisy OCR text
  console.log('--- Texto OCR real (com ruído) ---');
  const textoLimpo = cleanTextForTest(textoASOReal);

  const data1 = extrairDataDoTexto(textoLimpo);
  console.log('Data encontrada:', data1);
  test('Data extraída corretamente (2025-03-17 esperado)', data1 === '2025-03-17', `obteve: ${data1}`);

  const resultado1 = extrairResultado(textoLimpo);
  console.log('Resultado:', resultado1);
  test('Resultado = apto', resultado1 === 'apto', `obteve: ${resultado1}`);

  const crms1 = extrairCRMsDoTexto(textoLimpo);
  console.log('CRMs encontrados:', crms1);
  test(`Pelo menos 2 CRMs encontrados (médico coord + examinador)`, crms1.length >= 2, `obteve: ${crms1.length}`);

  const crmSelecionado1 = selecionarCRMMaisProximoDeExaminador(textoLimpo, crms1);
  console.log('CRM selecionado (examinador):', crmSelecionado1);
  test('CRM selecionado tem 8+ dígitos (padrão BR)', (crmSelecionado1?.crm?.length || 0) >= 8, `obteve: ${crmSelecionado1?.crm}`);

  const medicoNome1 = extrairNomeMedico(textoLimpo, crmSelecionado1?.indice ?? null);
  console.log('Nome médico encontrado:', medicoNome1);
  test('Nome médico não vazio', medicoNome1.length > 0, `obteve: '${medicoNome1}'`);
  test('Nome médico não contém "CRM"', !medicoNome1.toUpperCase().includes('CRM'), `obteve: ${medicoNome1}`);

  const examesReal = extrairExamesDoTexto(textoLimpo, data1);
  console.log('Exames extraídos do texto real:', examesReal);
  test('Pelo menos 4 exames extraídos', examesReal.length >= 4, `obteve: ${examesReal.length}`);
  test('Contém ACUIDADE VISUAL', examesReal.some(e => e.nome.includes('ACUIDADE VISUAL')), 'não encontrou Acuidade Visual');
  test('Contém RAIO X COLUNA LOMBAR', examesReal.some(e => e.nome.includes('RAIO X COLUNA LOMBAR')), 'não encontrou Raio X Coluna Lombar');
  test('Data dos exames = 2025-03-17', examesReal.every(e => e.data === '2025-03-17'), 'datas incorretas');

  // 2. Test with clean text (ideal OCR scenario)
  console.log('\n--- Texto limpo (OCR ideal) ---');
  const data2 = extrairDataDoTexto(textoSemOCRNoise);
  console.log('Data encontrada:', data2);
  test('Data extraída = 2025-03-17', data2 === '2025-03-17', `obteve: ${data2}`);

  const resultado2 = extrairResultado(textoSemOCRNoise);
  console.log('Resultado:', resultado2);
  test('Resultado = apto', resultado2 === 'apto', `obteve: ${resultado2}`);

  const crms2 = extrairCRMsDoTexto(textoSemOCRNoise);
  console.log('CRMs encontrados:', crms2);
  test('CRM examinador = 5201156279', crms2.some(c => c.crm.replace(/\D/g, '') === '5201156279'), `obteve: ${JSON.stringify(crms2.map(c => c.crm))}`);

  const crmSelecionado2 = selecionarCRMMaisProximoDeExaminador(textoSemOCRNoise, crms2);
  console.log('CRM selecionado:', crmSelecionado2);
  test('CRM selecionado = 5201156279', crmSelecionado2?.crm.replace(/\D/g, '') === '5201156279', `obteve: ${crmSelecionado2?.crm}`);

  const medicoNome2 = extrairNomeMedico(textoSemOCRNoise, crmSelecionado2?.indice ?? null);
  console.log('Nome médico encontrado:', medicoNome2);
  test('Nome médico = Mariana Costa Silva', medicoNome2.includes('Mariana'), `obteve: '${medicoNome2}'`);
  test('Nome médico limpo (sem prefixo)', !medicoNome2.startsWith('a.') && !medicoNome2.startsWith('Dra'), `obteve: '${medicoNome2}'`);

  // 3. Test false positive prevention (inapto appearing in standard text)
  console.log('\n--- Teste falso positivo INAPTO ---');
  const textoComDisclaimer = `RESULTADO: APTO
  Atestado de Saúde Ocupacional
  Em caso de inaptidão, o trabalhador será encaminhado ao INSS.
  Médico: Dr. João CRM: 12345`;

  const resultado3 = extrairResultado(textoComDisclaimer);
  console.log('Resultado:', resultado3);
  test('Resultado = apto (ignorou "inaptidão" no disclaimer)', resultado3 === 'apto', `obteve: ${resultado3}`);

  const textoComInaptoReal = `RESULTADO: INAPTO
  O trabalhador não está apto para a função.
  Médico: Dr. João CRM: 12345`;

  const resultado4 = extrairResultado(textoComInaptoReal);
  console.log('Resultado:', resultado4);
  test('Resultado = inapto (detectou INAPTO real)', resultado4 === 'inapto', `obteve: ${resultado4}`);

  // Summary
  console.log('\n========== RESUMO ==========');
  const results = [
    data1 === '2025-03-17',
    resultado1 === 'apto',
    crms1.length >= 2,
    (crmSelecionado1?.crm?.replace(/\D/g, '').length || 0) >= 8,
    medicoNome1.length > 0,
    examesReal.length >= 4,
    examesReal.some(e => e.nome.includes('ACUIDADE VISUAL')),
    examesReal.some(e => e.nome.includes('RAIO X COLUNA LOMBAR')),
    examesReal.every(e => e.data === '2025-03-17'),
    data2 === '2025-03-17',
    resultado2 === 'apto',
    crms2.some(c => c.crm.replace(/\D/g, '') === '5201156279'),
    (crmSelecionado2?.crm.replace(/\D/g, '') === '5201156279'),
    medicoNome2.includes('Mariana'),
    resultado3 === 'apto',
    resultado4 === 'inapto',
  ];

  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`${passed}/${total} testes passaram`);
  console.log(passed === total ? '\n🎉 TODOS OS TESTES PASSARAM!' : `\n⚠️ ${total - passed} teste(s) falharam`);
}

runTests();
