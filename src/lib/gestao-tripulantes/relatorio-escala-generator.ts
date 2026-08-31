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
  cpf_formatado: string;
  nome: string;
  cargo: string;
  centro_custo: string;
  empresa: string;
  embarcacao: string;
  total_dias_on: number;
  total_dias_dba: number;
  total_dias_fi: number;
  total_dias_tre: number;
  semanas: Record<string, string>;
}

export interface RelatorioEscalaResult {
  buffer: Buffer;
  totaisConsolidados: {
    totalColaboradores: number;
    totalON: number; // total de dias ON
    totalDBA: number; // total de dias DBA
    totalFI: number; // total de dias FI
    totalTRE: number; // total de dias TRE
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

function formatCpfDisplay(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
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

  dtInicio.setHours(0, 0, 0, 0);
  dtFim.setHours(23, 59, 59, 999);

  // 1. Geração de Semanas de Cronograma
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
  let curWeek = new Date(timelineStart);

  while (curWeek <= dtFim || weeks.length < 4) {
    const dStr = curWeek.toISOString().slice(0, 10);
    const dayStr = String(curWeek.getDate()).padStart(2, '0');
    const monthStr = curWeek.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    const yrStr = String(curWeek.getFullYear()).slice(2);
    weeks.push({
      dateStr: dStr,
      label: `${dayStr}-${monthStr}-${yrStr}`,
      date: new Date(curWeek),
    });
    curWeek.setDate(curWeek.getDate() + 7);
  }

  // 2. Buscar Dados no Banco (Colaboradores e Histórico de Eventos de Escala)
  const [{ data: colabs }, { data: embarques }] = await Promise.all([
    supabaseAdmin
      .from('gt_colaboradores')
      .select(`
        id, cpf, nome_completo, matricula, ativo, escala_embarque, escala_folga, regime_trabalho,
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
  ]);

  let colaboradores = colabs || [];
  const hist = embarques || [];

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

  let totalConsolDiasON = 0;
  let totalConsolDiasDBA = 0;
  let totalConsolDiasFI = 0;
  let totalConsolDiasTRE = 0;

  const colabTotais: ColaboradorTotaisEscala[] = [];

  // ----------------------------------------------------
  // MOTOR DE CÁLCULO DIÁRIO DE DIAS EMBARCADOS, DOBRAS, FI E TRE
  // ----------------------------------------------------
  for (const c of colaboradores) {
    const cpfNorm = normalizeCpf(c.cpf || '');
    const cHist = histPorColab.get(c.id) || [];

    // Limite regular da escala de embarque do colaborador (ex: 14, 28, 15, 30)
    let maxDiasRegulares = parseInt((c as any).escala_embarque, 10);
    if (isNaN(maxDiasRegulares) || maxDiasRegulares <= 0) {
      if ((c as any).regime_trabalho && typeof (c as any).regime_trabalho === 'string') {
        const match = (c as any).regime_trabalho.match(/^(\d+)x/i);
        if (match) maxDiasRegulares = parseInt(match[1], 10);
      }
    }
    if (isNaN(maxDiasRegulares) || maxDiasRegulares <= 0) {
      maxDiasRegulares = 14; // padrão offshore ABZ
    }

    let diasON = 0;
    let diasDBA = 0;
    let diasFI = 0;
    let diasTRE = 0;

    // Iteração diária estrita dentro do período do fechamento
    const dayIter = new Date(dtInicio);
    while (dayIter <= dtFim) {
      const currentDayTime = dayIter.getTime();
      let statusDoDia = '';

      for (const h of cHist) {
        if (!h.data_embarque) continue;
        const hStart = parseLocalDate(h.data_embarque);
        if (!hStart) continue;
        const hEnd = h.data_desembarque
          ? parseLocalDate(h.data_desembarque)
          : (h.data_prevista_desembarque ? parseLocalDate(h.data_prevista_desembarque) : new Date(hStart.getTime() + maxDiasRegulares * 86400000));
        if (!hEnd) continue;
        hEnd.setHours(23, 59, 59, 999);

        if (currentDayTime >= hStart.getTime() && currentDayTime <= hEnd.getTime()) {
          const cod = mapDbTipoToCodigo(h.tipo).toUpperCase();
          const diasCorridosEmbarque = Math.floor((currentDayTime - hStart.getTime()) / 86400000) + 1;

          if (cod === 'DBA') {
            statusDoDia = 'DBA';
          } else if (cod === 'FI') {
            statusDoDia = 'FI';
          } else if (cod === 'TRE' || cod === 'TF') {
            statusDoDia = 'TRE';
          } else if (cod === 'STB') {
            statusDoDia = 'STB';
          } else if (cod === 'OFFC' || cod === 'OFF-C') {
            statusDoDia = 'OFF-C';
          } else {
            // Rotação regular: se ultrapassar a escala máxima contínua, contabiliza como DBA (Dobra)
            if (diasCorridosEmbarque > maxDiasRegulares) {
              statusDoDia = 'DBA';
            } else {
              statusDoDia = 'ON';
            }
          }
          break;
        }
      }

      if (statusDoDia === 'ON') diasON++;
      else if (statusDoDia === 'DBA') diasDBA++;
      else if (statusDoDia === 'FI') diasFI++;
      else if (statusDoDia === 'TRE') diasTRE++;

      dayIter.setDate(dayIter.getDate() + 1);
    }

    // Mapa Semanal para visualização da grade no Excel
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
          : (h.data_prevista_desembarque ? parseLocalDate(h.data_prevista_desembarque) : new Date(hStart.getTime() + maxDiasRegulares * 86400000));
        if (!hEnd) continue;
        hEnd.setHours(23, 59, 59, 999);

        if (wStart <= hEnd && wEnd >= hStart) {
          const cod = mapDbTipoToCodigo(h.tipo).toUpperCase();
          if (cod === 'DBA') weekStatus = 'DBA';
          else if (cod === 'FI') weekStatus = 'FI';
          else if (cod === 'TRE' || cod === 'TF') weekStatus = 'TRE';
          else if (cod === 'STB') weekStatus = 'STB';
          else if (cod === 'OFFC' || cod === 'OFF-C') weekStatus = 'OFF-C';
          else weekStatus = 'ON';
          break;
        }
      }

      semanasMap[w.dateStr] = weekStatus;
    }

    totalConsolDiasON += diasON;
    totalConsolDiasDBA += diasDBA;
    totalConsolDiasFI += diasFI;
    totalConsolDiasTRE += diasTRE;

    const ccObj = c.centro_custo as any;
    const ccLabel = ccObj ? `${ccObj.codigo ? `${ccObj.codigo} - ` : ''}${ccObj.nome || ''}` : 'NÃO DEFINIDO';

    colabTotais.push({
      matricula: c.matricula || '-',
      cpf: cpfNorm,
      cpf_formatado: formatCpfDisplay(cpfNorm),
      nome: (c.nome_completo || '').toUpperCase(),
      cargo: ((c.cargo as any)?.nome || 'SEM CARGO').toUpperCase(),
      centro_custo: ccLabel.toUpperCase(),
      empresa: ((c.empresa as any)?.nome || 'ABZ').toUpperCase(),
      embarcacao: ((c.embarcacao_atual as any)?.nome || options.embarcacao || 'TODAS').toUpperCase(),
      total_dias_on: diasON,
      total_dias_dba: diasDBA,
      total_dias_fi: diasFI,
      total_dias_tre: diasTRE,
      semanas: semanasMap,
    });
  }

  // ----------------------------------------------------
  // CONSTRUÇÃO E FORMATAÇÃO VISUAL DO WORKBOOK XLSX
  // ----------------------------------------------------
  const wb = XLSX.utils.book_new();
  const totalCols = weeks.length + 11;

  const headerTitle = [
    `RELATÓRIO OFICIAL DE FECHAMENTO DE ESCALAS — DEPARTAMENTO PESSOAL & FOLHA`,
    ...Array(totalCols - 1).fill(''),
  ];

  const filtroSub = [
    `Período de Fechamento: ${options.mesAno || `${options.dataInicio || ''} a ${options.dataFim || ''}`}  |  Embarcação: ${options.embarcacao || 'Todas'}  |  Empresa: ${options.empresa || 'Todas'}  |  Emissão: ${new Date().toLocaleString('pt-BR')}`,
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
    'DIAS ON',
    'DIAS DBA',
    'DIAS FI',
    'DIAS TRE',
    ...weeks.map(w => w.label),
  ];

  const wsData: any[][] = [
    headerTitle,
    filtroSub,
    [], // Linha 3: em branco
    colHeaders, // Linha 4: cabeçalhos
  ];

  for (const c of colabTotais) {
    const row = [
      c.matricula,
      c.nome,
      c.cpf_formatado,
      c.cargo,
      c.centro_custo,
      c.empresa,
      c.embarcacao,
      c.total_dias_on,
      c.total_dias_dba,
      c.total_dias_fi,
      c.total_dias_tre,
      ...weeks.map(w => c.semanas[w.dateStr] || '-'),
    ];
    wsData.push(row);
  }

  // Linha de Totais Consolidados (soma diária total)
  const totalRow = [
    'TOTAL GERAL CONSOLIDADO (DIAS)',
    `${colabTotais.length} Colaboradores`,
    '',
    '',
    '',
    '',
    '',
    totalConsolDiasON,
    totalConsolDiasDBA,
    totalConsolDiasFI,
    totalConsolDiasTRE,
    ...weeks.map(() => ''),
  ];
  wsData.push(totalRow);

  // Lista de aprovadores para chancela e auditoria digital
  const listaAprovadores: AprovadorRegistro[] = options.aprovadores && options.aprovadores.length > 0
    ? options.aprovadores
    : (options.aprovador ? [options.aprovador] : []);

  const signatureStartRow = wsData.length + 1;
  if (listaAprovadores.length > 0) {
    wsData.push([]);
    wsData.push(['AUTENTICAÇÃO & ASSINATURAS DIGITAIS DE FECHAMENTO — AUDITORIA CRIPTOGRÁFICA', ...Array(totalCols - 1).fill('')]);
    
    for (const apr of listaAprovadores) {
      wsData.push([
        `✓ Assinado Digitalmente por: ${apr.nome} ${apr.cargo ? `(${apr.cargo})` : ''} | CPF: ${apr.cpf || 'N/A'} | Data/Hora: ${apr.dataHora} | IP: ${apr.ip || '127.0.0.1'} | Hash: ${apr.assinaturaHash || 'N/A'}`,
        ...Array(totalCols - 1).fill('')
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Definir larguras de colunas ideais
  ws['!cols'] = [
    { wch: 14 }, // Matrícula
    { wch: 34 }, // Nome
    { wch: 18 }, // CPF
    { wch: 28 }, // Cargo
    { wch: 28 }, // Centro de Custo
    { wch: 18 }, // Empresa
    { wch: 18 }, // Embarcação
    { wch: 12 }, // DIAS ON
    { wch: 12 }, // DIAS DBA
    { wch: 12 }, // DIAS FI
    { wch: 12 }, // DIAS TRE
    ...weeks.map(() => ({ wch: 12 })),
  ];

  // Definir alturas das linhas
  const rowHeights = [
    { hpt: 32 }, // Título
    { hpt: 20 }, // Subtítulo
    { hpt: 8 },  // Linha em branco
    { hpt: 26 }, // Cabeçalhos de coluna
  ];
  for (let i = 0; i < colabTotais.length; i++) {
    rowHeights.push({ hpt: 20 });
  }
  rowHeights.push({ hpt: 24 }); // Linha de total
  ws['!rows'] = rowHeights;

  // Mesclagens de células para títulos e rodapé
  const merges: any[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // Título principal mesclado
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } }, // Subtítulo mesclado
  ];

  if (listaAprovadores.length > 0) {
    merges.push({ s: { r: signatureStartRow, c: 0 }, e: { r: signatureStartRow, c: totalCols - 1 } });
    for (let idx = 0; idx < listaAprovadores.length; idx++) {
      merges.push({ s: { r: signatureStartRow + 1 + idx, c: 0 }, e: { r: signatureStartRow + 1 + idx, c: totalCols - 1 } });
    }
  }
  ws['!merges'] = merges;

  // Bordas e estilos de cores
  const defaultBorder = {
    top: { style: 'thin', color: { rgb: 'D0D7DE' } },
    bottom: { style: 'thin', color: { rgb: 'D0D7DE' } },
    left: { style: 'thin', color: { rgb: 'D0D7DE' } },
    right: { style: 'thin', color: { rgb: 'D0D7DE' } },
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    ON: { bg: 'D9EAD3', text: '274E13' },
    DBA: { bg: 'FCE5CD', text: '783F04' },
    FI: { bg: 'CFE2F3', text: '0B5394' },
    TRE: { bg: 'EFEFEF', text: '434343' },
    STB: { bg: 'FFF2CC', text: '7F6000' },
    'OFF-C': { bg: 'F4CCCC', text: '990000' },
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
        // Título Principal
        cellStyle.font = { bold: true, color: { rgb: 'FFFFFF' }, sz: 12, name: 'Segoe UI' };
        cellStyle.fill = { fgColor: { rgb: '002060' } };
        cellStyle.alignment = { vertical: 'center', horizontal: 'center' };
      } else if (R === 1) {
        // Subtítulo
        cellStyle.font = { italic: true, color: { rgb: '334155' }, sz: 9, name: 'Segoe UI' };
        cellStyle.fill = { fgColor: { rgb: 'F1F5F9' } };
        cellStyle.alignment = { vertical: 'center', horizontal: 'center' };
      } else if (R === 3) {
        // Cabeçalhos de colunas
        cellStyle.font = { bold: true, color: { rgb: C < 7 ? 'FFFFFF' : (C < 11 ? '002060' : '000000') }, sz: 9, name: 'Segoe UI' };
        cellStyle.fill = { fgColor: { rgb: C < 7 ? '002060' : (C < 11 ? 'BDD7EE' : 'E2EFDA') } };
        cellStyle.border = defaultBorder;
      } else if (R === 4 + colabTotais.length) {
        // Linha de Totais Gerais
        cellStyle.font = { bold: true, color: { rgb: '002060' }, sz: 10, name: 'Segoe UI' };
        cellStyle.fill = { fgColor: { rgb: 'D9E1F2' } };
        cellStyle.border = defaultBorder;
      } else if (R > 3 && R < 4 + colabTotais.length) {
        // Linhas de dados de colaboradores
        cellStyle.font = { sz: 9, name: 'Segoe UI' };
        cellStyle.border = defaultBorder;
        if (C === 7) {
          cellStyle.fill = { fgColor: { rgb: 'E2EFDA' } };
          cellStyle.font = { bold: true, color: { rgb: '274E13' } };
        } else if (C === 8) {
          cellStyle.fill = { fgColor: { rgb: 'FCE5CD' } };
          cellStyle.font = { bold: true, color: { rgb: '783F04' } };
        } else if (C === 9) {
          cellStyle.fill = { fgColor: { rgb: 'CFE2F3' } };
          cellStyle.font = { bold: true, color: { rgb: '0B5394' } };
        } else if (C === 10) {
          cellStyle.fill = { fgColor: { rgb: 'EFEFEF' } };
          cellStyle.font = { bold: true, color: { rgb: '434343' } };
        } else if (C >= 11 && typeof cell.v === 'string' && colorMap[cell.v]) {
          cellStyle.fill = { fgColor: { rgb: colorMap[cell.v].bg } };
          cellStyle.font = { color: { rgb: colorMap[cell.v].text }, bold: true, sz: 9 };
        }
      } else if (R >= signatureStartRow) {
        // Linhas de Chancelas Digitais
        cellStyle.font = { sz: 8, color: { rgb: '0F5132' }, name: 'Segoe UI' };
        cellStyle.fill = { fgColor: { rgb: 'D1E7DD' } };
        cellStyle.alignment = { vertical: 'center', horizontal: 'left' };
      }

      cell.s = cellStyle;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Fechamento DP');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return {
    buffer: Buffer.from(buffer),
    totaisConsolidados: {
      totalColaboradores: colabTotais.length,
      totalON: totalConsolDiasON,
      totalDBA: totalConsolDiasDBA,
      totalFI: totalConsolDiasFI,
      totalTRE: totalConsolDiasTRE,
    },
    colaboradoresTotais: colabTotais,
    semanas: weeks.map(w => w.dateStr),
  };
}