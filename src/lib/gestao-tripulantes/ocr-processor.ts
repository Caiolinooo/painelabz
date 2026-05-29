import { processarDocumentoOCR as processarDocumentoOCRGlobal } from '@/lib/ocr';
import { supabaseAdmin } from '@/lib/supabase';
import { buscarCodigoExame } from '@/lib/e-social/codigos';
import type { TipoDocumento } from '@/types/gestao-tripulantes';
import type { OCRExtractResult, OCRTipoDocumento } from '@/types/ocr';

export type { OCRExtractResult };

export async function processarDocumentoOCR(
  arquivoUrl: string,
  tipoDocumento: TipoDocumento
): Promise<OCRExtractResult> {
  return processarDocumentoOCRGlobal(arquivoUrl, tipoDocumento as OCRTipoDocumento);
}

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

  // Pass 1: buscar data em linhas que contêm palavras-chave de data
  for (const linha of linhas) {
    if (PALAVRAS_DATA_PROXIMA.some(p => linha.toLowerCase().includes(p))) {
      // dd/mm/aaaa
      const m1 = linha.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m1) {
        const [_, d, mes, a] = m1;
        if (parseInt(d) >= 1 && parseInt(d) <= 31 && parseInt(mes) >= 1 && parseInt(mes) <= 12) {
          return `${a}-${mes}-${d}`;
        }
      }
      // dd de MÊS de aaaa / dd MÊS aaaa
      const m2 = linha.match(/(\d{1,2})\s*(?:DE\s+)?([A-Za-zÀ-ÖØ-öø-ÿçãõ]+)\.?\s*(?:DE\s+)?(\d{4})/i);
      if (m2) {
        const converted = converterDataTexto(m2[1], m2[2], m2[3]);
        if (converted) return converted;
      }
    }
  }

  // Pass 2: any dd/mm/aaaa in the text, prefer the most recent
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

  // Pass 3: text-based date anywhere (e.g., "18 MAR 2025")
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

  // Clean trailing .0 that OCR may produce instead of -9 or similar
  crm = crm.replace(/\.0$/, '');
  crm = crm.replace(/[^\d]/g, '');

  if (crm.length >= 4 && crm.length <= 15) {
    return crm;
  }

  return crm;
}

function extrairCRMsDoTexto(texto: string): { crm: string; uf: string; contexto: string; indice: number }[] {
  const crmPatterns = [
    // CRM-UF: 99999 ou CRM UF 99999 — greedy quantifier to capture full number
    /(?:CRM|C\.R\.M\.|RM|IM|REGISTRO)\s*(?:-?\s*([A-Z]{2}))?\s*[:|I\-\s]*\s*([\d][\d.\s-]{4,}\d)/gi,
    // Just numbers near "CRM" context (catch corrupted ones)
    /(?:CRM|C\.R\.M\.)\s*[:|I\-\s]*\s*(\d[\d.\s]{4,}\d)/gi,
  ];

  const resultados: { crm: string; uf: string; contexto: string; indice: number }[] = [];

  for (const pattern of crmPatterns) {
    const matches = [...texto.matchAll(pattern)];
    for (const m of matches) {
      const uf = m[1] ? m[1].toUpperCase() : '';
      const crmRaw = m[2] || m[1] || m[0].replace(/^.*?(CRM|C\.R\.M\.|RM|IM|REGISTRO)\s*[:|\-]*\s*/i, '');
      const crmNormalizado = normalizarCRM(crmRaw);
      if (crmNormalizado.length < 4) continue;

      const start = Math.max(0, (m.index || 0) - 150);
      const end = Math.min(texto.length, (m.index || 0) + (m[0]?.length || 0) + 150);
      const contexto = texto.substring(start, end).replace(/\n/g, ' ').trim();

      resultados.push({
        crm: crmNormalizado,
        uf,
        contexto,
        indice: m.index || 0,
      });
    }
  }

  return resultados;
}

function obterUFDoContexto(contexto: string): string {
  const ctxUpper = contexto.toUpperCase();
  const m = ctxUpper.match(/CRM\s*[-/]?\s*([A-Z]{2})/);
  if (m) return m[1];
  
  const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  for (const uf of ufs) {
    const reg = new RegExp(`\\b${uf}\\b`);
    if (reg.test(ctxUpper)) {
      return uf;
    }
  }
  return 'RJ';
}

function extrairNomeMedicoDoContexto(texto: string, crmIndice: number, tipo: 'pcmso' | 'examinador'): string {
  const lines = texto.split('\n');
  const crmLineIdx = texto.substring(0, crmIndice).split('\n').length - 1;
  
  const start = Math.max(0, crmLineIdx - 3);
  const end = Math.min(lines.length, crmLineIdx + 2);
  
  // Loop backwards from CRM line to find the name closest to the CRM
  for (let i = Math.min(lines.length - 1, crmLineIdx); i >= start; i--) {
    const linha = lines[i].trim();
    if (!linha) continue;

    if (/(?:hospital|policlínica|policlinica|clínica|clinica|unidade|av\.|rua|telefone|fone|cnpj|cep|sac|atendimento|whatsapp|site|www|@)/i.test(linha)) {
      continue;
    }
    if (/^\d/.test(linha)) continue;

    // Clean common prefixes
    let linhaLimpa = linha
      .replace(/^(?:Nome do Médico Coordenador|Nome do Médico|Nome do Medico|Nome|Médico\s+Responsável\s+pelo\s+PCMSO|Médico\s+Examinador|Medico\s+Examinador|Assinatura\s*\/?[Cc]arimbo\s*[Mm]édico\s*[Examinador]*|Assinatura\s+do\s+candidato|Colaborador)[\s:]*/i, '')
      .replace(/^(?:M[eé]dica?\b\s*|Dra?\.?\s*[ºª]?\s*|Drª\s*|Drº\s*|DRA?\.?\s*)/i, '')
      .replace(/[\[\]|_:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // If it contains DRA or Dr or Dra not at the beginning, clean it
    linhaLimpa = linhaLimpa.replace(/\b(?:Dra?\.?\s*[ºª]?\s*|Drª\s*|Drº\s*|DRA?\.?\s*)\b/i, '').trim();

    // Truncate at common OCR noise words or instructions
    const noiseWords = ['valide', 'validacao', 'validação', 'validate', 'validation', 'or code', 'code', 'link', 'http', 'https', 'www', 'aso', 'rqe', 'crm', 'assinatura', 'carimbo', 'médico', 'medico', 'colaborador', 'exame realizado'];
    for (const word of noiseWords) {
      const idx = linhaLimpa.toLowerCase().indexOf(word);
      if (idx !== -1) {
        linhaLimpa = linhaLimpa.substring(0, idx).trim();
      }
    }

    if (linhaLimpa.length > 5 && linhaLimpa.split(' ').length >= 2 && !/\d/.test(linhaLimpa)) {
      return linhaLimpa;
    }
  }

  let regex = /(?:Dr\.?\s*[ºª]?\s*|Dra\.?\s*[ºª]?\s*|Drª\s*|Drº\s*)([A-Za-zÀ-ÖØ-öø-ÿçãõ\s]{10,60})/i;
  if (tipo === 'pcmso') {
    const pcmsoIdx = texto.toLowerCase().indexOf('pcmso');
    if (pcmsoIdx !== -1) {
      const sub = texto.substring(pcmsoIdx - 50, pcmsoIdx + 200);
      const match = sub.match(regex);
      if (match) return match[1].trim();
    }
  }

  const medicoMatch = texto.match(regex);
  if (medicoMatch) {
    return medicoMatch[1].trim();
  }

  return '';
}

function extrairDadosDosMedicos(
  texto: string,
  crms: { crm: string; uf: string; contexto: string; indice: number }[]
): {
  medico_nome: string;
  medico_crm: string;
  medico_uf: string;
  medico_pcmso_nome: string;
  medico_pcmso_crm: string;
  medico_pcmso_uf: string;
} {
  let medico_nome = '';
  let medico_crm = '';
  let medico_uf = '';
  let medico_pcmso_nome = '';
  let medico_pcmso_crm = '';
  let medico_pcmso_uf = '';

  if (crms.length === 0) {
    return { medico_nome, medico_crm, medico_uf, medico_pcmso_nome, medico_pcmso_crm, medico_pcmso_uf };
  }

  const crmsClassificados = crms.map(item => {
    const ctxLower = item.contexto.toLowerCase();
    const isPCMSO = ctxLower.includes('pcmso') || ctxLower.includes('responsavel') || ctxLower.includes('responsável') || ctxLower.includes('coordenador') || ctxLower.includes('coord');
    const isExaminer = ctxLower.includes('examinador') || ctxLower.includes('examinadora') || ctxLower.includes('assinatura') || ctxLower.includes('emitente') || ctxLower.includes('carimbo');
    
    let scorePCMSO = isPCMSO ? 10 : 0;
    let scoreExaminer = isExaminer ? 10 : 0;

    if (ctxLower.includes('pcmso')) scorePCMSO += 20;
    if (ctxLower.includes('examinador')) scoreExaminer += 20;

    return { ...item, scorePCMSO, scoreExaminer };
  });

  const pcmsoCandidates = [...crmsClassificados].sort((a, b) => b.scorePCMSO - a.scorePCMSO);
  if (pcmsoCandidates[0] && pcmsoCandidates[0].scorePCMSO > 0) {
    const bestPCMSO = pcmsoCandidates[0];
    medico_pcmso_crm = bestPCMSO.crm;
    medico_pcmso_uf = bestPCMSO.uf || obterUFDoContexto(bestPCMSO.contexto);
    medico_pcmso_nome = extrairNomeMedicoDoContexto(texto, bestPCMSO.indice, 'pcmso');
  }

  const examinerCandidates = crmsClassificados.filter(item => item.crm !== medico_pcmso_crm);
  const candidatesToUse = examinerCandidates.length > 0 ? examinerCandidates : crmsClassificados;
  candidatesToUse.sort((a, b) => b.scoreExaminer - a.scoreExaminer);
  
  if (candidatesToUse[0]) {
    const bestExaminer = candidatesToUse[0];
    medico_crm = bestExaminer.crm;
    medico_uf = bestExaminer.uf || obterUFDoContexto(bestExaminer.contexto);
    medico_nome = extrairNomeMedicoDoContexto(texto, bestExaminer.indice, 'examinador');
  }

  if (medico_crm === medico_pcmso_crm && crms.length > 1) {
    const outro = crms.find(c => c.crm !== medico_crm);
    if (outro) {
      const outroCtx = outro.contexto.toLowerCase();
      if (outroCtx.includes('pcmso') || outroCtx.includes('responsavel') || outroCtx.includes('coordenador')) {
        medico_pcmso_crm = outro.crm;
        medico_pcmso_uf = outro.uf || obterUFDoContexto(outro.contexto);
        medico_pcmso_nome = extrairNomeMedicoDoContexto(texto, outro.indice, 'pcmso');
      } else {
        medico_crm = outro.crm;
        medico_uf = outro.uf || obterUFDoContexto(outro.contexto);
        medico_nome = extrairNomeMedicoDoContexto(texto, outro.indice, 'examinador');
      }
    }
  }

  return { medico_nome, medico_crm, medico_uf, medico_pcmso_nome, medico_pcmso_crm, medico_pcmso_uf };
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

export async function extrairDadosASODoTexto(
  documentoId: string,
  texto: string,
  dadosExtraidos: Record<string, any>,
  colaboradorId: string,
  dataEmissao?: string | null
): Promise<void> {
  // Verificar se o ASO pertence a outro colaborador baseado no CPF ou Nome extraído
  let colaboradorIdFinal = colaboradorId;
  const cpfExtraido = dadosExtraidos?.cpf ? String(dadosExtraidos.cpf).replace(/\D/g, '') : null;
  const nomeExtraido = dadosExtraidos?.nome_completo;

  if (cpfExtraido && cpfExtraido.length === 11) {
    const { data: colabCorreto } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('id')
      .eq('cpf', cpfExtraido)
      .is('deleted_at', null)
      .maybeSingle();

    if (colabCorreto && colabCorreto.id !== colaboradorId) {
      console.log(`[OCR/Reassociation] ASO do documento ${documentoId} pertence ao colaborador com CPF ${cpfExtraido} e não ao original. Reassociando...`);
      colaboradorIdFinal = colabCorreto.id;

      await supabaseAdmin
        .from('gt_documentos')
        .update({
          colaborador_id: colabCorreto.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentoId);
    }
  } else if (nomeExtraido && nomeExtraido.trim().length > 5) {
    const { data: colabCorreto } = await supabaseAdmin
      .from('gt_colaboradores')
      .select('id')
      .ilike('nome_completo', nomeExtraido.trim())
      .is('deleted_at', null)
      .maybeSingle();

    if (colabCorreto && colabCorreto.id !== colaboradorId) {
      console.log(`[OCR/Reassociation] ASO do documento ${documentoId} pertence ao colaborador "${nomeExtraido}". Reassociando...`);
      colaboradorIdFinal = colabCorreto.id;

      await supabaseAdmin
        .from('gt_documentos')
        .update({
          colaborador_id: colabCorreto.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentoId);
    }
  }

  // 1. Type of exam
  let tipo_exame = dadosExtraidos?.tipo_exame || 'periodico';
  if (!dadosExtraidos?.tipo_exame) {
    if (/admissional/i.test(texto)) tipo_exame = 'admissional';
    else if (/demissional/i.test(texto)) tipo_exame = 'demissional';
    else if (/retorno/i.test(texto)) tipo_exame = 'retorno';
    else if (/mudança\s+de\s+função|mudanca\s+de\s+funcao/i.test(texto)) tipo_exame = 'mudanca_funcao';
  }

  // 2. Result
  const resultado = dadosExtraidos?.resultado || extrairResultado(texto);

  // 3. Date
  let data_realizacao: string | null = dadosExtraidos?.data_realizacao || null;

  if (data_realizacao && data_realizacao.includes('/')) {
    const parts = data_realizacao.split('/');
    if (parts.length === 3) {
      data_realizacao = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  if (!data_realizacao) {
    data_realizacao = extrairDataDoTexto(texto);
  }

  if (!data_realizacao && dataEmissao) {
    data_realizacao = dataEmissao;
  }

  // 4. Doctors (Examiner and PCMSO Coordinator)
  const crmsEncontrados = extrairCRMsDoTexto(texto);
  const dadosMedicos = extrairDadosDosMedicos(texto, crmsEncontrados);

  let medico_nome = dadosExtraidos?.medico_examinador_nome || dadosExtraidos?.medico || dadosMedicos.medico_nome || '';
  let medico_crm = dadosExtraidos?.medico_examinador_crm || dadosExtraidos?.medico_crm || dadosMedicos.medico_crm || '';
  let medico_uf = dadosExtraidos?.medico_examinador_uf || dadosMedicos.medico_uf || 'RJ';
  
  let medico_pcmso_nome = dadosExtraidos?.medico_pcmso_nome || dadosMedicos.medico_pcmso_nome || '';
  let medico_pcmso_crm = dadosExtraidos?.medico_pcmso_crm || dadosMedicos.medico_pcmso_crm || '';
  let medico_pcmso_uf = dadosExtraidos?.medico_pcmso_uf || dadosMedicos.medico_pcmso_uf || 'RJ';

  // 5. Clinic info
  let cnpj_clinica = dadosExtraidos?.cnpj_clinica || '';
  let nome_clinica = dadosExtraidos?.nome_clinica || '';

  if (!cnpj_clinica) {
    const cnpjMatch = texto.match(/(?:CNPJ|C\.N\.P\.J)\s*[:|I\s-]*\s*(\d{2}\s*\.\s*\d{3}\s*\.\s*\d{3}\s*\/\s*\d{4}\s*-\s*\d{2}|\d{14})/i);
    if (cnpjMatch) {
      cnpj_clinica = cnpjMatch[1].replace(/[^\d]/g, '');
    }
  }

  if (!nome_clinica) {
    if (/policlínica|policlinica/i.test(texto)) {
      nome_clinica = 'Policlínica';
    } else {
      const clinicaMatch = texto.match(/(?:Clínica|Clinica|Centro\s+Médico|Laboratório|Laboratorio)\s*:?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
      if (clinicaMatch) {
        nome_clinica = clinicaMatch[1].trim().split('\n')[0];
      }
    }
  }

  // 6. Complementary exams
  let exames_realizados = dadosExtraidos?.exames_realizados;
  if (!exames_realizados || !Array.isArray(exames_realizados) || exames_realizados.length === 0) {
    exames_realizados = extrairExamesDoTexto(texto, data_realizacao);
  }

  const examesComCodigos = [];
  if (Array.isArray(exames_realizados)) {
    for (const ex of exames_realizados) {
      const codProc = await buscarCodigoExame(ex.nome);
      examesComCodigos.push({
        ...ex,
        codProc: codProc || '9999'
      });
    }
  }

  await supabaseAdmin
    .from('gt_documentos_aso')
    .upsert({
      documento_id: documentoId,
      colaborador_id: colaboradorIdFinal,
      tipo_exame,
      resultado,
      data_realizacao,
      medico_nome: medico_nome || null,
      medico_crm: medico_crm || null,
      medico_uf: medico_uf || null,
      medico_pcmso_nome: medico_pcmso_nome || null,
      medico_pcmso_crm: medico_pcmso_crm || null,
      medico_pcmso_uf: medico_pcmso_uf || null,
      cnpj_clinica: cnpj_clinica || null,
      nome_clinica: nome_clinica || null,
      exames_realizados: examesComCodigos.length > 0 ? examesComCodigos : null,
      esocial_status: 'nao_enviado',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'documento_id' });
}
