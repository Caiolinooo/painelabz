import { generateEventXML, validateEventXML } from '@/services/eSocialService';
import { autoCorrigirDadosEvento, Correcao } from './esocialAutoCorrector';
import { validarDadosEvento, validarXMLGerado, CampoPendente } from './esocialValidator';

export interface PreEnvioResult {
  pronto: boolean;
  xml?: string;
  correcoesAplicadas: Correcao[];
  erros: string[];
  camposPendentes: CampoPendente[];
  dadosCorrigidos?: any;
}

export function resolverMatricula(evento: any): string {
  if (!evento) return '';
  const raw = evento.dados_evento?.dadosEspecificos || evento.dados_evento || {};
  return raw.matricula_esocial
    || evento.dados_evento?.matricula_esocial
    || raw.matricula
    || evento.dados_evento?.matricula
    || evento.matricula
    || '';
}

export async function validarEPrepararEnvio(evento: any, tpAmb?: number): Promise<PreEnvioResult> {
  const codigoEvento = evento.evento_codigo;
  let dadosOriginais = evento.dados_evento;
  if (!dadosOriginais) dadosOriginais = { dadosEspecificos: {} };

  // Garante que o CPF base está disponível no objeto de dados
  if (evento.cpf_trabalhador && !dadosOriginais.cpf && !dadosOriginais.cpfTrab) {
    dadosOriginais.cpf = evento.cpf_trabalhador;
  }
  
  // Garante que CNPJ base está disponível
  if (evento.cnpj_empregador && !dadosOriginais.cnpj && !dadosOriginais.nrInsc) {
    dadosOriginais.cnpj = evento.cnpj_empregador;
  }

  // Sincroniza matrícula do modelo com os dados se faltar
  const mat = resolverMatricula(evento);
  if (mat) {
    dadosOriginais.matricula = mat;
    if (!dadosOriginais.dadosEspecificos) dadosOriginais.dadosEspecificos = {};
    dadosOriginais.dadosEspecificos.matricula = mat;
  }

  // 1. Auto-Correção
  const { dadosCorrigidos, correcoes, xmlPrecisaRebuildar } = autoCorrigirDadosEvento(codigoEvento, dadosOriginais, tpAmb);

  // 2. Validação dos Dados
  const valDados = validarDadosEvento(codigoEvento, dadosCorrigidos);

  if (valDados.erros.some(e => !e.autocorrigivel) || valDados.camposPendentes.length > 0) {
    return {
      pronto: false,
      correcoesAplicadas: correcoes,
      erros: valDados.erros.map(e => e.mensagem),
      camposPendentes: valDados.camposPendentes,
      dadosCorrigidos
    };
  }

  // 3. Rebuild XML se necessário (ou se ainda não existia)
  let xml = evento.xml_gerado;
  let rebuildRealizado = false;

  // Analisa bugs conhecidos que forçam rebuild
  const xmlTemBugAso = xml && codigoEvento === 'S-2220' && /<aso>\s*<resAso>/.test(xml);
  const xmlTemDataInvalida = xml && /\d{4}-(1[3-9]|[2-9]\d)-\d{2}/.test(xml);
  
  // Se o tpAmb do XML estiver diferente do tpAmb requisitado, força rebuild
  const tagAmbienteEsperada = `<tpAmb>${tpAmb}</tpAmb>`;
  const xmlTemAmbErrado = xml && !xml.includes(tagAmbienteEsperada);

  if (!xml || xmlPrecisaRebuildar || xmlTemBugAso || xmlTemDataInvalida || xmlTemAmbErrado) {
    try {
      xml = generateEventXML(codigoEvento, dadosCorrigidos);
      rebuildRealizado = true;
    } catch (e: any) {
      return {
        pronto: false,
        correcoesAplicadas: correcoes,
        erros: [`Erro ao gerar XML: ${e.message}`],
        camposPendentes: [],
        dadosCorrigidos
      };
    }
  }

  // 4. Validação final do XML
  let valXMLNovo = validarXMLGerado(xml, codigoEvento);
  
  // Se o XML original estava quebrado e ainda não tentamos rebuildar, forçamos um rebuild agora
  if (!valXMLNovo.valido && !rebuildRealizado) {
    try {
      xml = generateEventXML(codigoEvento, dadosCorrigidos);
      rebuildRealizado = true;
      valXMLNovo = validarXMLGerado(xml, codigoEvento);
    } catch (e: any) {
      // Ignora erro do catch para cair na validação normal abaixo
    }
  }

  if (!valXMLNovo.valido) {
    return {
      pronto: false,
      xml,
      correcoesAplicadas: correcoes,
      erros: valXMLNovo.erros.map(e => e.mensagem),
      camposPendentes: [],
      dadosCorrigidos
    };
  }

  // Legado eSocialService validacao (safety net)
  const legacyVal = validateEventXML(xml);
  if (!legacyVal.valido) {
     return {
      pronto: false,
      xml,
      correcoesAplicadas: correcoes,
      erros: legacyVal.erros,
      camposPendentes: [],
      dadosCorrigidos
    };
  }

  return {
    pronto: true,
    xml,
    correcoesAplicadas: correcoes,
    erros: [],
    camposPendentes: [],
    dadosCorrigidos
  };
}
