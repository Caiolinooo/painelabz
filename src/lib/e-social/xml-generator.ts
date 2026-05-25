import { gerarS2220, DadosS2220 } from './eventos/s-2220';
import { validarXML } from './validacao';

type TipoAso = 'ADMISSIONAL' | 'PERIODICO' | 'RETORNO' | 'MUDANCA' | 'DEMISSIONAL';
type ResultadoAso = 'APTO' | 'APTO_COM_RESTRICAO' | 'INAPTO';

export function getTipoAso(tipo: TipoAso): number {
  const mapa: Record<TipoAso, number> = {
    ADMISSIONAL: 1,
    PERIODICO: 2,
    RETORNO: 3,
    MUDANCA: 4,
    DEMISSIONAL: 5,
  };
  return mapa[tipo] ?? 2;
}

export function getResultadoAso(resultado: ResultadoAso): number {
  const mapa: Record<ResultadoAso, number> = {
    APTO: 1,
    APTO_COM_RESTRICAO: 2,
    INAPTO: 3,
  };
  return mapa[resultado] ?? 1;
}

export function gerarXMLEvento(codigoEvento: string, dados: Record<string, unknown>): string {
  switch (codigoEvento) {
    case 'S-2220':
      return gerarS2220(dados as unknown as DadosS2220);
    case 'S-2200':
      return gerarS2200(dados);
    case 'S-2300':
      return gerarS2300(dados);
    case 'S-2399':
      return gerarS2399(dados);
    case 'S-3000':
      return gerarS3000(dados);
    default:
      throw new Error(`Evento não implementado: ${codigoEvento}`);
  }
}

interface DadosS2200 {
  ideEvento: Record<string, unknown>;
  ideEmpregador: { tpInsc: number; nrInsc: string };
  ideTrabalhador: { cpfTrab: string; nmTrab?: string };
}

function gerarS2200(dados: Record<string, unknown>): string {
  const d = dados as unknown as DadosS2200;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<eSocial>\n  <evtAdmissao>\n';
  xml += '    <ideEvento>\n';
  if (d.ideEvento?.tpAmb !== undefined) xml += `      <tpAmb>${d.ideEvento.tpAmb}</tpAmb>\n`;
  if (d.ideEvento?.procEmi !== undefined) xml += `      <procEmi>${d.ideEvento.procEmi}</procEmi>\n`;
  if (d.ideEvento?.verProc) xml += `      <verProc>${d.ideEvento.verProc}</verProc>\n`;
  xml += '    </ideEvento>\n';
  xml += '    <ideEmpregador>\n';
  xml += `      <tpInsc>${d.ideEmpregador?.tpInsc ?? 1}</tpInsc>\n`;
  const nrInscFormatted = (d.ideEmpregador?.tpInsc ?? 1) === 1
    ? (d.ideEmpregador?.nrInsc ?? '').replace(/\D/g, '').substring(0, 8)
    : (d.ideEmpregador?.nrInsc ?? '');
  xml += `      <nrInsc>${nrInscFormatted}</nrInsc>\n`;
  xml += '    </ideEmpregador>\n';
  xml += '    <ideTrabalhador>\n';
  xml += `      <cpfTrab>${d.ideTrabalhador?.cpfTrab ?? ''}</cpfTrab>\n`;
  if (d.ideTrabalhador?.nmTrab) xml += `      <nmTrab>${d.ideTrabalhador.nmTrab}</nmTrab>\n`;
  xml += '    </ideTrabalhador>\n';
  xml += '  </evtAdmissao>\n</eSocial>';
  return xml;
}

interface DadosS2300 {
  cpfTrab: string;
  cnpjTerceiro?: string;
}

function gerarS2300(dados: Record<string, unknown>): string {
  const d = dados as unknown as DadosS2300;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<eSocial>\n  <evtTSVInicio>\n';
  xml += '    <ideTrabalhador>\n';
  xml += `      <cpfTrab>${d.cpfTrab ?? ''}</cpfTrab>\n`;
  xml += '    </ideTrabalhador>\n';
  if (d.cnpjTerceiro) {
    xml += '    <infoTerceiro>\n';
    xml += `      <cnpjTerc>${d.cnpjTerceiro}</cnpjTerc>\n`;
    xml += '    </infoTerceiro>\n';
  }
  xml += '  </evtTSVInicio>\n</eSocial>';
  return xml;
}

interface DadosS2399 {
  cpfTrab: string;
  dtDeslig: string;
}

function gerarS2399(dados: Record<string, unknown>): string {
  const d = dados as unknown as DadosS2399;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<eSocial>\n  <evtTSVTermino>\n';
  xml += '    <ideTrabalhador>\n';
  xml += `      <cpfTrab>${d.cpfTrab ?? ''}</cpfTrab>\n`;
  xml += '    </ideTrabalhador>\n';
  if (d.dtDeslig) {
    xml += '    <infoTSVTermino>\n';
    xml += `      <dtTerm>${d.dtDeslig}</dtTerm>\n`;
    xml += '    </infoTSVTermino>\n';
  }
  xml += '  </evtTSVTermino>\n</eSocial>';
  return xml;
}

interface DadosS3000 {
  nrRecibo: string;
  tpEv: string;
}

function gerarS3000(dados: Record<string, unknown>): string {
  const d = dados as unknown as DadosS3000;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<eSocial>\n  <evtRemocao>\n';
  xml += '    <ideEvento>\n';
  if (d.nrRecibo) xml += `      <nrRecibo>${d.nrRecibo}</nrRecibo>\n`;
  xml += '    </ideEvento>\n';
  if (d.tpEv) xml += `    <infoRemocao><tpEv>${d.tpEv}</tpEv></infoRemocao>\n`;
  xml += '  </evtRemocao>\n</eSocial>';
  return xml;
}
