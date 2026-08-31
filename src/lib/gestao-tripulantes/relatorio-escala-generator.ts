import { supabaseAdmin } from '@/lib/supabase';
import { normalizeCpf, mapDbTipoToCodigo } from '@/lib/gestao-tripulantes/escala-tipos';

export interface AprovadorRegistro {
  nome: string;
  cpf?: string;
  email?: string;
  cargo?: string;
  dataHora: string;
  ip?: string;
  assinaturaUrl?: string;
  assinaturaHash?: string;
}

export interface RelatorioEscalaOptions {
  mesAno?: string;
  dataInicio?: string;
  dataFim?: string;
  empresa?: string;
  embarcacao?: string;
  cargo?: string;
  statusAtivo?: 'ativos' | 'inativos' | 'todos';
  busca?: string;
  aprovador?: AprovadorRegistro;
  aprovadores?: AprovadorRegistro[];
}

export interface ColaboradorTotaisEscala {
  matricula: string;
  cpf: string;
  nome: string;
  cargo: string;
  centro_custo: string;
  empresa: string;
  embarcacao: string;
  total_on: number;
  total_dba: number;
  total_fi: number;
  total_tre: number;
  semanas: Record<string, string>;
}

export interface RelatorioEscalaResult {
  buffer: Buffer;
  totaisConsolidados: {
    totalColaboradores: number;
    totalON: number;
    totalDBA: number;
    totalFI: number;
    totalTRE: number;
  };
  colaboradoresTotais: ColaboradorTotaisEscala[];
  semanas: string[];
}

function parseLocalDate(str: string | null | undefined): Date | null {
  if (!str || typeof str !== 'string' || str.trim() === '') return null;
  const clean = str.trim().slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const parsed = new Date(y, m, d, 0, 0, 0, 0);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export async function gerarRelatorioEscalaMensal(
  options: RelatorioEscalaOptions = {}
): Promise<RelatorioEscalaResult> {
  const xlsxMod = (await import('xlsx-js-style')) as { utils?: unknown; default?: { utils?: unknown } };
  const XLSX = (xlsxMod.utils ? xlsxMod : (xlsxMod as any).default) as typeof import('xlsx-js-style');

  let dtInicio: Date;
  let dtFim: Date;

  if (options.dataInicio && options.dataFim) {
    dtInicio = parseLocalDate(options.dataInicio) || new Date();
    dtFim = parseLocalDate(options.dataFim) || new Date();
  } else if (options.mesAno) {
    const [y, m] = options.mesAno.split('-').map(Number);
    dtInicio = new Date(y, m - 1, 1, 0, 0, 0, 0);
    dtFim = new Date(y, m, 0, 23, 59, 59, 999);
  } else {
    const now = new Date();
    dtInicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    dtFim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const snapToSaturday = (d: Date) => {
    const res = new Date(d);
    const day = res.getDay();
    const diff = day >= 6 ? day - 6 : day + 1;
    res.setDate(res.getDate() - diff);
    res.setHours(0, 0, 0, 0);
    return res;
  };

  const timelineStart = snapToSaturday(new Date(dtInicio));
  const weeks: { dateStr: string; label: string; date: Date }[] = [];
  let cur = new Date(timelineStart);

  while (cur <= dtFim || weeks.length < 4) {
    const dStr = cur.toISOString().slice(0, 10);
    const dayStr = String(cur.getDate()).padStart(2, '0');
    const monthStr = cur.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    const yrStr = String(cur.getFullYear()).slice(2);
    weeks.push({
      dateStr: dStr,
      label: `${dayStr}-${monthStr}-${yrStr}`,
      date: new Date(cur),
    });
    cur.setDate(cur.getDate() + 7);
  }

  const [{ data: colabs }, { data: embarques }, { data: treinamentosDocs }] = await Promise.all([
    supabaseAdmin
      .from('gt_colaboradores')
      .select(`
        id, cpf, nome_completo, matricula, ativo,
        cargo:gt_cargos(nome),
        empresa:gt_empresas(nome),
        embarcacao_atual:gt_embarcacoes!embarcacao_atual_id(nome),
        centro_custo:gt_centros_custo(codigo, nome)
      `)
      .is('deleted_at', null)
      .order('nome_completo'),
    supabaseAdmin
      .from('gt_historico_embarques')
      .select(`
        id, colaborador_id, tipo, data_embarque, data_desembarque,
        data_prevista_desembarque, local_embarque, local_desembarque,
        observacoes, origem
      `)
      .is('deleted_at', null),
    supabaseAdmin
      .from('gt_documentos')
      .select('id, colaborador_id, tipo_documento, titulo, data_emissao, data_validade')
      .eq('tipo_documento', 'treinamento')
      .is('deleted_at', null)
  ]);

  let colaboradores = colabs || [];
  const hist = embarques || [];
  const treDocs = treinamentosDocs || [];

  // Aplicar filtros especificados
  if (options.empresa) {
    const emp = options.empresa.toLowerCase().trim();
    colaboradores = colaboradores.filter(c => ((c.empresa as any)?.nome || '').toLowerCase().trim() === emp);
  }
  if (options.embarcacao) {
    const emb = options.embarcacao.toLowerCase().trim();
    colaboradores = colaboradores.filter(c => ((c.embarcacao_atual as any)?.nome || '').toLowerCase().trim() === emb);
  }
  if (options.cargo) {
    const car = options.cargo.toLowerCase().trim();
    colaboradores = colaboradores.filter(c => ((c.cargo as any)?.nome || '').toLowerCase().trim() === car);
  }
  if (options.statusAtivo === 'ativos') {
    colaboradores = colaboradores.filter(c => c.ativo !== false);
  } else if (options.statusAtivo === 'inativos') {
    colaboradores = colaboradores.filter(c => c.ativo === false);
  }
  if (options.busca) {
    const q = options.busca.toLowerCase().trim();
    colaboradores = colaboradores.filter(c => 
      (c.nome_completo || '').toLowerCase().includes(q) ||
      (c.cpf || '').includes(q) ||
      (c.matricula || '').toLowerCase().includes(q)
    );
  }

  const histPorColab = new Map<string, any[]>();
  for (const h of hist) {
    const arr = histPorColab.get(h.colaborador_id) || [];
    arr.push(h);
    histPorColab.set(h.colaborador_id, arr);
  }

  const trePorColab = new Map<string, any[]>();
  for (const t of treDocs) {
    const arr = trePorColab.get(t.colaborador_id) || [];
    arr.push(t);
    trePorColab.set(t.colaborador_id, arr);
  }

  let totalConsolON = 0;
  let totalConsolDBA = 0;
  let totalConsolFI = 0;
  let totalConsolTRE = 0;

  const colabTotais: ColaboradorTotaisEscala[] = [];

  for (const c of colaboradores) {
    const cpfNorm = normalizeCpf(c.cpf || '');
    const cHist = histPorColab.get(c.id) || [];
    const cTre = trePorColab.get(c.id) || [];

    let countON = 0;
    let countDBA = 0;
    let countFI = 0;
    let countTRE = 0;

    const semanasMap: Record<string, string> = {};

    for (const w of weeks) {
      const wStart = new Date(w.date);
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);

      let weekStatus = '';

      for (const h of cHist) {
        if (!h.data_embarque) continue;
        const hStart = parseLocalDate(h.data_embarque);
        if (!hStart) continue;
        const hEnd = h.data_desembarque
          ? parseLocalDate(h.data_desembarque)
          : (h.data_prevista_desembarque ? parseLocalDate(h.data_prevista_desembarque) : new Date(hStart.getTime() + 14 * 86400000));
        if (!hEnd) continue;
        hEnd.setHours(23, 59, 59, 999);

        if (wStart <= hEnd && wEnd >= hStart) {
          const cod = mapDbTipoToCodigo(h.tipo).toUpperCase();
          if (cod === 'DBA') weekStatus = 'DBA';
          else if (cod === 'FI') weekStatus = 'FI';
          else if (cod === 'TRE') weekStatus = 'TRE';
          else if (cod === 'STB') weekStatus = 'STB';
          else if (cod === 'OFFC') weekStatus = 'OFF-C';
          else weekStatus = 'ON';
          break;
        }
      }

      if (!weekStatus) {
        for (const t of cTre) {
          if (!t.data_emissao) continue;
          const tStart = parseLocalDate(t.data_emissao);
          if (!tStart) continue;
          const tEnd = t.data_validade ? parseLocalDate(t.data_validade) : tStart;
          if (!tEnd) continue;
          tEnd.setHours(23, 59, 59, 999);

          if (wStart <= tEnd && wEnd >= tStart) {
            weekStatus = 'TRE';
            break;
          }
        }
      }

      semanasMap[w.dateStr] = weekStatus;

      if (weekStatus === 'ON') countON++;
      else if (weekStatus === 'DBA') countDBA++;
      else if (weekStatus === 'FI') countFI++;
      else if (weekStatus === 'TRE') countTRE++;
    }

    totalConsolON += countON;
    totalConsolDBA += countDBA;
    totalConsolFI += countFI;
    totalConsolTRE += countTRE;

    const ccObj = c.centro_custo as any;
    const ccLabel = ccObj ? `${ccObj.codigo ? `${ccObj.codigo} - ` : ''}${ccObj.nome || ''}` : 'NÃO DEFINIDO';

    colabTotais.push({
      matricula: c.matricula || '-',
      cpf: cpfNorm,
      nome: (c.nome_completo || '').toUpperCase(),
      cargo: ((c.cargo as any)?.nome || 'SEM CARGO').toUpperCase(),
      centro_custo: ccLabel.toUpperCase(),
      empresa: ((c.empresa as any)?.nome || 'ABZ').toUpperCase(),
      embarcacao: ((c.embarcacao_atual as any)?.nome || options.embarcacao || 'TODAS').toUpperCase(),
      total_on: countON,
      total_dba: countDBA,
      total_fi: countFI,
      total_tre: countTRE,
      semanas: semanasMap,
    });
  }

  // ----------------------------------------------------
  // CONSTRUÇÃO DO WORKBOOK XLSX EM FOLHA ÚNICA
  // ----------------------------------------------------
  const wb = XLSX.utils.book_new();

  const totalCols = weeks.length + 11;
  const headerTitle = [
    `RELATÓRIO OFICIAL DE FECHAMENTO DE ESCALAS — DEPARTAMENTO PESSOAL & FOLHA`,
    ...Array(totalCols - 1).fill(''),
  ];

  const filtroSub = [
    `Período: ${options.mesAno || `${options.dataInicio || ''} a ${options.dataFim || ''}`} | Embarcação: ${options.embarcacao || 'Todas'} | Empresa: ${options.empresa || 'Todas'} | Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    ...Array(totalCols - 1).fill(''),
  ];

  const colHeaders = [
    'MATRÍCULA',
    'NOME DO COLABORADOR',
    'CPF',
    'CARGO',
    'CENTRO DE CUSTO',
    'EMPRESA',
    'EMBARCAÇÃO',
    'TOTAL ON',
    'TOTAL DBA',
    'TOTAL FI',
    'TOTAL TRE',
    ...weeks.map(w => w.label),
  ];

  const wsData: any[][] = [
    headerTitle,
    filtroSub,
    [], // linha em branco
    colHeaders,
  ];

  for (const c of colabTotais) {
    const row = [
      c.matricula,
      c.nome,
      c.cpf,
      c.cargo,
      c.centro_custo,
      c.empresa,
      c.embarcacao,
      c.total_on || '-',
      c.total_dba || '-',
      c.total_fi || '-',
      c.total_tre || '-',
      ...weeks.map(w => c.semanas[w.dateStr] || '-'),
    ];
    wsData.push(row);
  }

  // Linha de Totais Consolidados
  const totalRow = [
    'TOTAL CONSOLIDADO',
    `${colabTotais.length} Colaboradores`,
    '',
    '',
    '',
    '',
    '',
    totalConsolON,
    totalConsolDBA,
    totalConsolFI,
    totalConsolTRE,
    ...weeks.map(() => ''),
  ];
  wsData.push(totalRow);

  // Lista de aprovadores para chancela
  const listaAprovadores: AprovadorRegistro[] = options.aprovadores && options.aprovadores.length > 0
    ? options.aprovadores
    : (options.aprovador ? [options.aprovador] : []);

  if (listaAprovadores.length > 0) {
    wsData.push([]);
    wsData.push(['AUTENTICAÇÃO & ASSINATURAS DIGITAIS DE FECHAMENTO', ...Array(totalCols - 1).fill('')]);
    
    for (const apr of listaAprovadores) {
      wsData.push([
        `✓ Aprovado e Assinado Digitalmente por: ${apr.nome} ${apr.cargo ? `(${apr.cargo})` : ''} | CPF: ${apr.cpf || 'N/A'} | Data: ${apr.dataHora} | IP: ${apr.ip || '127.0.0.1'} | Hash: ${apr.assinaturaHash || 'N/A'}`,
        ...Array(totalCols - 1).fill('')
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 14 }, // Matrícula
    { wch: 34 }, // Nome
    { wch: 16 }, // CPF
    { wch: 24 }, // Cargo
    { wch: 26 }, // Centro de Custo
    { wch: 18 }, // Empresa
    { wch: 18 }, // Embarcação
    { wch: 12 }, // ON
    { wch: 12 }, // DBA
    { wch: 12 }, // FI
    { wch: 14 }, // TRE
    ...weeks.map(() => ({ wch: 12 })),
  ];

  const defaultBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    ON: { bg: 'E2EFDA', text: '00B050' },
    DBA: { bg: 'FCE4D6', text: 'C65911' },
    FI: { bg: 'D9E1F2', text: '203764' },
    TRE: { bg: 'EDEDED', text: '3B3838' },
    STB: { bg: 'FFF2CC', text: '7F6000' },
    'OFF-C': { bg: 'F8CBAD', text: 'C00000' },
  };

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
      const cell = ws[cellRef];
      if (!cell) continue;

      const cellStyle: any = {
        alignment: { vertical: 'center', horizontal: C === 1 ? 'left' : 'center', wrapText: true },
      };

      if (R === 0) {
        cellStyle.font = { bold: true, color: { rgb: 'FFFFFF' }, sz: 13 };
        cellStyle.fill = { fgColor: { rgb: '002060' } };
        cellStyle.border = defaultBorder;
      } else if (R === 3) {
        cellStyle.font = { bold: true, color: { rgb: C < 7 ? 'FFFFFF' : (C < 11 ? '002060' : '000000') }, sz: 10 };
        cellStyle.fill = { fgColor: { rgb: C < 7 ? '002060' : (C < 11 ? 'BDD7EE' : 'E2EFDA') } };
        cellStyle.border = defaultBorder;
      } else if (R === 4 + colabTotais.length) {
        cellStyle.font = { bold: true, color: { rgb: '002060' }, sz: 11 };
        cellStyle.fill = { fgColor: { rgb: 'D9E1F2' } };
        cellStyle.border = defaultBorder;
      } else if (R > 3 && R < 4 + colabTotais.length) {
        cellStyle.font = { sz: 9 };
        cellStyle.border = defaultBorder;
        if (C === 7) cellStyle.fill = { fgColor: { rgb: 'E2EFDA' } };
        else if (C === 8) cellStyle.fill = { fgColor: { rgb: 'FCE4D6' } };
        else if (C === 9) cellStyle.fill = { fgColor: { rgb: 'D9E1F2' } };
        else if (C === 10) cellStyle.fill = { fgColor: { rgb: 'EDEDED' } };
        else if (C >= 11 && typeof cell.v === 'string' && colorMap[cell.v]) {
          cellStyle.fill = { fgColor: { rgb: colorMap[cell.v].bg } };
          cellStyle.font = { color: { rgb: colorMap[cell.v].text }, bold: true, sz: 9 };
        }
      }
      cell.s = cellStyle;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return {
    buffer: Buffer.from(buffer),
    totaisConsolidados: {
      totalColaboradores: colabTotais.length,
      totalON: totalConsolON,
      totalDBA: totalConsolDBA,
      totalFI: totalConsolFI,
      totalTRE: totalConsolTRE,
    },
    colaboradoresTotais: colabTotais,
    semanas: weeks.map(w => w.dateStr),
  };
}