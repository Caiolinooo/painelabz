const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Copy definitions from ocr-processor.ts to debug
function normalizarCRM(raw) {
  let crm = raw.trim();
  crm = crm.replace(/\s+/g, '');
  crm = crm.replace(/[I|l|]/g, '1').trim();
  crm = crm.replace(/\.0$/, '');
  crm = crm.replace(/[^\d]/g, '');
  return crm;
}

function extrairCRMsDoTexto(texto) {
  const crmPatterns = [
    /(?:CRM|C\.R\.M\.|RM|IM|REGISTRO)\s*(?:-?\s*([A-Z]{2}))?\s*[:|I\-\s]*\s*([\d][\d.\s-]{4,}\d)/gi,
    /(?:CRM|C\.R\.M\.)\s*[:|I\-\s]*\s*(\d[\d.\s]{4,}\d)/gi,
  ];

  const resultados = [];
  for (const pattern of crmPatterns) {
    const matches = [...texto.matchAll(pattern)];
    for (const m of matches) {
      const uf = m[1] ? m[1].toUpperCase() : '';
      const crmRaw = m[2] || m[1] || '';
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
        raw_m: m
      });
    }
  }
  return resultados;
}

function obterUFDoContexto(contexto) {
  const ctxUpper = contexto.toUpperCase();
  const m = ctxUpper.match(/CRM\s*[-/]?\s*([A-Z]{2})/);
  if (m) return m[1];
  const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  for (const uf of ufs) {
    if (new RegExp(`\\b${uf}\\b`).test(ctxUpper)) return uf;
  }
  return 'RJ';
}

function extrairNomeMedicoDoContexto(texto, crmIndice, tipo) {
  const lines = texto.split('\n');
  const crmLineIdx = texto.substring(0, crmIndice).split('\n').length - 1;
  const start = Math.max(0, crmLineIdx - 3);
  const end = Math.min(lines.length, crmLineIdx + 2);
  
  console.log(`[Nome Extração - ${tipo}] Linhas do contexto (de ${start} a ${end}):`, lines.slice(start, end));
  
  // Loop backwards from CRM line to find the name closest to the CRM
  for (let i = Math.min(lines.length - 1, crmLineIdx); i >= start; i--) {
    const linha = lines[i].trim();
    if (!linha) continue;
    if (/(?:hospital|policlínica|policlinica|clínica|clinica|unidade|av\.|rua|telefone|fone|cnpj|cep|sac|atendimento|whatsapp|site|www|@)/i.test(linha)) continue;
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

    console.log(`[Nome Extração - ${tipo}] Linha original: "${linha}", Linha limpa: "${linhaLimpa}"`);
    if (linhaLimpa.length > 5 && linhaLimpa.split(' ').length >= 2 && !/\d/.test(linhaLimpa)) {
      return linhaLimpa;
    }
  }
  return '';
}

async function run() {
  const docId = '7ce44b7c-de06-40f7-ba8f-dddea780e248';
  const { data: doc } = await supabase.from('gt_documentos').select('ocr_texto').eq('id', docId).single();
  const text = doc.ocr_texto;

  console.log("=== TRECHO DO TEXTO DE 1900 A 2200 ===");
  console.log(text.substring(1900, 2200));
  console.log("======================================");

  console.log("CRMs encontrados:");
  const crms = extrairCRMsDoTexto(text);
  console.log(JSON.stringify(crms, null, 2));

  console.log("\nExecutando extrairDadosDosMedicos...");
  const resultado = extrairDadosDosMedicos(text, crms);
  console.log("\nResultado de extrairDadosDosMedicos:");
  console.log(JSON.stringify(resultado, null, 2));
}

function extrairDadosDosMedicos(
  texto,
  crms
) {
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

run();
