interface IdeEvento {
  indRetif?: number;
  nrRecibo?: string;
  tpAmb: number;
  procEmi: number;
  verProc: string;
}

interface IdeEmpregador {
  tpInsc: number;
  nrInsc: string;
}

interface IdeTrabalhador {
  cpfTrab: string;
  nmTrab?: string;
  nisTrab?: string;
}

interface Medico {
  nmMed: string;
  nrCRM: string;
  ufCRM: string;
}

interface ExameRealizado {
  dtExm: string;
  procRealizado: string;
  obsExm?: string;
}

interface ASO {
  dtAso: string;
  resAso: number;
  exames: ExameRealizado[];
}

interface RespMonit {
  cpfResp?: string;
  nmResp: string;
  nrCRM: string;
  ufCRM: string;
}

interface ExameOcupacional {
  dtExame: string;
  tpExame: number;
  aso: ASO;
  medico: Medico;
  respMonit?: RespMonit;
}

export interface DadosS2220 {
  ideEvento: IdeEvento;
  ideEmpregador: IdeEmpregador;
  ideTrabalhador: IdeTrabalhador;
  exameOcupacional: ExameOcupacional;
}

function xmlEncode(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildTag(tag: string, value: string | number | undefined | null, indent: number): string {
  if (value === undefined || value === null) return '';
  const spaces = '  '.repeat(indent);
  return `${spaces}<${tag}>${xmlEncode(String(value))}</${tag}>\n`;
}

export function gerarS2220(dados: DadosS2220): string {
  const { ideEvento, ideEmpregador, ideTrabalhador, exameOcupacional } = dados;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00">\n';
  xml += '  <evtMonit>\n';

  // ideEvento
  xml += '    <ideEvento>\n';
  xml += buildTag('indRetif', ideEvento.indRetif ?? 1, 4);
  xml += buildTag('nrRecibo', ideEvento.nrRecibo, 4);
  xml += buildTag('tpAmb', ideEvento.tpAmb, 4);
  xml += buildTag('procEmi', ideEvento.procEmi, 4);
  xml += buildTag('verProc', ideEvento.verProc, 4);
  xml += '    </ideEvento>\n';

  // ideEmpregador
  xml += '    <ideEmpregador>\n';
  xml += buildTag('tpInsc', ideEmpregador.tpInsc, 4);
  const nrInscFormatted = ideEmpregador.tpInsc === 1
    ? ideEmpregador.nrInsc.replace(/\D/g, '').substring(0, 8)
    : ideEmpregador.nrInsc;
  xml += buildTag('nrInsc', nrInscFormatted, 4);
  xml += '    </ideEmpregador>\n';

  // ideTrabalhador
  xml += '    <ideTrabalhador>\n';
  xml += buildTag('cpfTrab', ideTrabalhador.cpfTrab, 4);
  xml += buildTag('nmTrab', ideTrabalhador.nmTrab, 4);
  xml += buildTag('nisTrab', ideTrabalhador.nisTrab, 4);
  xml += '    </ideTrabalhador>\n';

  // exameOcupacional
  xml += '    <exameOcupacional>\n';
  xml += buildTag('dtExame', exameOcupacional.dtExame, 4);
  xml += buildTag('tpExame', exameOcupacional.tpExame, 4);

  // aso
  xml += '      <aso>\n';
  xml += buildTag('dtAso', exameOcupacional.aso.dtAso, 6);
  xml += buildTag('resAso', exameOcupacional.aso.resAso, 6);

  const seenExames = new Set<string>();
  const examesUnicos = [];
  for (const exame of exameOcupacional.aso.exames) {
    const key = `${exame.dtExm}-${exame.procRealizado}`;
    if (!seenExames.has(key)) {
      seenExames.add(key);
      examesUnicos.push(exame);
    }
  }

  for (const exame of examesUnicos) {
    xml += '        <exame>\n';
    xml += buildTag('dtExm', exame.dtExm, 8);
    xml += buildTag('procRealizado', exame.procRealizado, 8);
    xml += buildTag('obsExm', exame.obsExm, 8);
    xml += '        </exame>\n';
  }

  xml += '      </aso>\n';

  // medico
  xml += '      <medico>\n';
  xml += buildTag('nmMed', exameOcupacional.medico.nmMed, 6);
  xml += buildTag('nrCRM', exameOcupacional.medico.nrCRM, 6);
  xml += buildTag('ufCRM', exameOcupacional.medico.ufCRM, 6);
  xml += '      </medico>\n';

  // respMonit
  if (exameOcupacional.respMonit) {
    xml += '      <respMonit>\n';
    if (exameOcupacional.respMonit.cpfResp) {
      xml += buildTag('cpfResp', exameOcupacional.respMonit.cpfResp, 6);
    }
    xml += buildTag('nmResp', exameOcupacional.respMonit.nmResp, 6);
    xml += buildTag('nrCRM', exameOcupacional.respMonit.nrCRM, 6);
    xml += buildTag('ufCRM', exameOcupacional.respMonit.ufCRM, 6);
    xml += '      </respMonit>\n';
  }

  xml += '    </exameOcupacional>\n';
  xml += '  </evtMonit>\n';
  xml += '</eSocial>';

  return xml;
}
