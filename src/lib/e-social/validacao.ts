export interface ErroValidacao {
  campo: string;
  mensagem: string;
}

function extrairCampo(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extrairTodosCampos(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, 'g');
  const matches: string[] = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function validacoesS2220(xml: string): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  if (!extrairCampo(xml, 'cpfTrab')) {
    erros.push({ campo: 'cpfTrab', mensagem: 'CPF do trabalhador é obrigatório' });
  }

  if (!extrairCampo(xml, 'dtExame')) {
    erros.push({ campo: 'dtExame', mensagem: 'Data do exame é obrigatória' });
  }

  const tpExame = extrairCampo(xml, 'tpExame');
  if (!tpExame) {
    erros.push({ campo: 'tpExame', mensagem: 'Tipo de exame é obrigatório' });
  } else if (!['1', '2', '3', '4', '5'].includes(tpExame)) {
    erros.push({ campo: 'tpExame', mensagem: `Tipo de exame inválido: ${tpExame}. Valores: 1-Admissional, 2-Periodico, 3-Retorno, 4-Mudanca, 5-Demissional` });
  }

  if (!extrairCampo(xml, 'dtAso')) {
    erros.push({ campo: 'dtAso', mensagem: 'Data do ASO é obrigatória' });
  }

  const resAso = extrairCampo(xml, 'resAso');
  if (!resAso) {
    erros.push({ campo: 'resAso', mensagem: 'Resultado do ASO é obrigatório' });
  } else if (!['1', '2', '3'].includes(resAso)) {
    erros.push({ campo: 'resAso', mensagem: `Resultado do ASO inválido: ${resAso}. Valores: 1-Apto, 2-Apto com restricao, 3-Inapto` });
  }

  if (!extrairCampo(xml, 'nmMed')) {
    erros.push({ campo: 'nmMed', mensagem: 'Nome do médico é obrigatório' });
  }

  if (!extrairCampo(xml, 'nrCRM')) {
    erros.push({ campo: 'nrCRM', mensagem: 'CRM do médico é obrigatório' });
  }

  if (!extrairCampo(xml, 'ufCRM')) {
    erros.push({ campo: 'ufCRM', mensagem: 'UF do CRM é obrigatório' });
  }

  const exames = extrairTodosCampos(xml, 'procRealizado');
  if (exames.length === 0) {
    erros.push({ campo: 'exames', mensagem: 'Pelo menos um exame realizado deve ser informado' });
  }

  return erros;
}

function validacoesGerais(xml: string): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  if (!xml || xml.trim().length === 0) {
    erros.push({ campo: 'xml', mensagem: 'XML vazio' });
    return erros;
  }

  if (!xml.includes('<?xml')) {
    erros.push({ campo: 'xml', mensagem: 'Declaração XML não encontrada' });
  }

  if (!xml.includes('<eSocial')) {
    erros.push({ campo: 'xml', mensagem: 'Tag raiz <eSocial> não encontrada' });
  }

  const tpAmb = extrairCampo(xml, 'tpAmb');
  if (!tpAmb) {
    erros.push({ campo: 'tpAmb', mensagem: 'Tipo de ambiente (tpAmb) é obrigatório' });
  } else if (!['1', '2'].includes(tpAmb)) {
    erros.push({ campo: 'tpAmb', mensagem: `Tipo de ambiente inválido: ${tpAmb}. Use 1-Producao ou 2-Producao restrita` });
  }

  const nrInsc = extrairCampo(xml, 'nrInsc');
  if (!nrInsc) {
    erros.push({ campo: 'nrInsc', mensagem: 'Número de inscrição do empregador é obrigatório' });
  } else if (nrInsc.length < 3) {
    erros.push({ campo: 'nrInsc', mensagem: `Número de inscrição inválido: ${nrInsc}` });
  }

  return erros;
}

export function validarXML(xml: string, codigoEvento: string): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  erros.push(...validacoesGerais(xml));

  if (erros.length > 0 && erros.some(e => e.campo === 'xml')) {
    return erros;
  }

  switch (codigoEvento) {
    case 'S-2220':
      erros.push(...validacoesS2220(xml));
      break;
    case 'S-2200':
    case 'S-2300':
    case 'S-2399':
    case 'S-3000':
      break;
    default:
      erros.push({ campo: 'codigoEvento', mensagem: `Evento não suportado para validação: ${codigoEvento}` });
  }

  return erros;
}
