/**
 * Gerador de PDF para o módulo de Férias.
 *
 * Segue o mesmo padrão visual do gerador de reembolso (src/lib/pdf-generator.ts):
 * - Header com logo ABZ, código de documento e data
 * - Seções tabulares com autoTable
 * - Cores padronizadas (azul ABZ no header, cinza nos labels)
 *
 * Gera dois tipos de documento:
 * 1. Comprovante de Férias (para uma solicitação específica já existente)
 * 2. Formulário de Férias em branco (para preenchimento manual/impressão)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';
import { formatCpf } from '@/lib/utils/identity';

type ColorTuple = [number, number, number];

const COLORS = {
  BLUE_HEADER: [0, 80, 239] as ColorTuple,    // Azul ABZ #0050ef
  LIGHT_BLUE_BG: [224, 234, 252] as ColorTuple, // Azul claro para destacar
  YELLOW_BG: [255, 255, 235] as ColorTuple,    // Amarelo suave para campos preenchíveis
  GREEN_BG: [220, 252, 231] as ColorTuple,     // Verde claro para aprovação
  RED_BG: [254, 226, 226] as ColorTuple,       // Vermelho claro para rejeição
  GREY_BG: [220, 220, 220] as ColorTuple,      // Cinza para labels
  GREY_LIGHT: [245, 245, 245] as ColorTuple,   // Cinza muito claro
  WHITE: [255, 255, 255] as ColorTuple,
  BLACK: [0, 0, 0] as ColorTuple
};

function formatDatePTBR(dateString: string | Date | undefined | null): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString + 'T00:00:00') : new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString('pt-BR');
}

function formatDateTimePTBR(dateString: string | Date | undefined | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const bitmap = fs.readFileSync(logoPath);
      return `data:image/png;base64,${bitmap.toString('base64')}`;
    }
  } catch (error) {
    console.warn('[Leave PDF] Logo not found:', error);
  }
  return '';
}

export interface LeavePeriod {
  start_date: string;
  end_date: string;
  duration: number;
}

export interface LeaveRequestPDFData {
  id: string;
  created_at: string;
  updated_at?: string;
  user_name: string;
  user_email: string;
  user_cpf?: string;
  user_position?: string;
  user_sector?: string;
  start_date: string;
  end_date: string;
  periods: LeavePeriod[] | null;
  status: string;
  justification?: string;
  rejection_reason?: string;
  pecuniary_allowance?: boolean;
  advance_13th_salary?: boolean;
  leader_name?: string;
  manager_name?: string;
  leader_approved_at?: string;
  manager_approved_at?: string;
}

/** Dias corridos inclusivos entre duas datas YYYY-MM-DD (mesma regra da UI /ferias). */
function computeDurationDays(startDate: string | undefined | null, endDate: string | undefined | null): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${String(startDate).slice(0, 10)}T12:00:00Z`);
  const end = new Date(`${String(endDate).slice(0, 10)}T12:00:00Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function normalizePeriods(data: LeaveRequestPDFData): LeavePeriod[] {
  const raw: LeavePeriod[] = (data.periods && data.periods.length > 0)
    ? data.periods
    : [{ start_date: data.start_date, end_date: data.end_date, duration: 0 }];

  return raw.map((p) => {
    const duration = (p.duration && p.duration > 0)
      ? p.duration
      : computeDurationDays(p.start_date, p.end_date);
    return {
      start_date: p.start_date,
      end_date: p.end_date,
      duration
    };
  });
}

function formatCpfForPdf(cpf: string | undefined | null): string {
  if (!cpf) return '—';
  const formatted = formatCpf(cpf);
  return formatted || '—';
}

/**
 * Traduz o status interno para um label amigável em português.
 */
function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_LEADER: 'Aguardando Aprovação do Líder',
    PENDING_MANAGER: 'Aguardando Aprovação do Gerente',
    APPROVED: 'Aprovado',
    REJECTED: 'Rejeitado',
    CANCELLED: 'Cancelado'
  };
  return labels[status] || status;
}

/**
 * Retorna a cor de fundo do status para destaque visual.
 */
function statusBgColor(status: string): ColorTuple {
  if (status === 'APPROVED') return COLORS.GREEN_BG;
  if (status === 'REJECTED') return COLORS.RED_BG;
  if (status === 'CANCELLED') return COLORS.GREY_BG;
  return COLORS.LIGHT_BLUE_BG;
}

/**
 * Monta o cabeçalho padrão ABZ (logo + identificação do documento).
 */
function buildHeader(doc: jsPDF, logoBase64: string, docCode: string, docTitle: string, procRef: string, pageTitle: string): number {
  let currentY = 10;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [],
    body: [
      [
        { content: '', rowSpan: 4, styles: { minCellHeight: 25, valign: 'middle' as const, halign: 'center' as const } },
        { content: 'ANEXO / ANNEX', styles: { fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold' as const, halign: 'left' as const, fontSize: 8, cellPadding: 1 } },
        { content: `COD.: ${docCode}`, styles: { halign: 'left' as const, fontStyle: 'bold' as const, textColor: COLORS.BLUE_HEADER, fontSize: 8, cellPadding: 1 } }
      ],
      [
        { content: docTitle, rowSpan: 2, styles: { valign: 'middle' as const, fontSize: 13, fontStyle: 'bold' as const, halign: 'left' as const, textColor: COLORS.BLACK } },
        { content: `Proc. Ref.: ${procRef}`, styles: { fontSize: 7, valign: 'middle' as const, halign: 'left' as const } }
      ],
      [
        { content: 'REV.: 0', styles: { fontSize: 7, valign: 'middle' as const, halign: 'left' as const } }
      ],
      [
        { content: 'Aplicável a / Applicable to: ( X ) Brasil   (   ) International', styles: { fontSize: 7, valign: 'middle' as const, halign: 'left' as const } },
        { content: `Data/Date: ${new Date().toLocaleDateString('pt-BR')}    PAG.: 1`, styles: { fontSize: 7, valign: 'middle' as const, halign: 'left' as const } }
      ]
    ] as any[][],
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 100 },
      2: { cellWidth: 40 }
    },
    styles: {
      lineColor: COLORS.BLACK,
      lineWidth: 0.1,
      fontSize: 9,
      textColor: COLORS.BLACK,
      cellPadding: 1,
      overflow: 'hidden' as const
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0 && data.row.index === 0 && logoBase64) {
        const cellHeight = data.cell.height;
        const imgHeight = 12;
        const imgWidth = 40;
        const xPos = data.cell.x + (data.cell.width - imgWidth) / 2;
        const yPos = data.cell.y + (cellHeight - imgHeight) / 2;
        try {
          doc.addImage(logoBase64, 'PNG', xPos, yPos, imgWidth, imgHeight);
        } catch (e) {
          console.warn('[Leave PDF] Erro ao adicionar logo:', e);
        }
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Título da página
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.BLUE_HEADER[0], COLORS.BLUE_HEADER[1], COLORS.BLUE_HEADER[2]);
  doc.text(pageTitle, 14, currentY);
  currentY += 6;

  return currentY;
}

/**
 * Gera o PDF do Comprovante de Solicitação de Férias (para uma solicitação
 * já existente no sistema).
 */
export async function generateLeaveRequestPDF(data: LeaveRequestPDFData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = getLogoBase64();
  let currentY = buildHeader(
    doc,
    logoBase64,
    'AN-RH-001',
    'Comprovante de Solicitação de Férias',
    'PR-RH-01',
    `Comprovante de Férias — ${data.user_name}`
  );

  // --- Identificação do Solicitante ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'IDENTIFICAÇÃO DO SOLICITANTE:', colSpan: 4, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Nome Completo:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: data.user_name || '', colSpan: 3, styles: { fontSize: 9 } }
      ],
      [
        { content: 'E-mail:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: data.user_email || '', styles: { fontSize: 9 } },
        { content: 'CPF:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: formatCpfForPdf(data.user_cpf), styles: { fontSize: 9 } }
      ],
      [
        { content: 'Cargo:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: data.user_position || '—', styles: { fontSize: 9 } },
        { content: 'Setor:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: data.user_sector || '—', styles: { fontSize: 9 } }
      ]
    ],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25 },
      3: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Status da Solicitação ---
  const statusBg = statusBgColor(data.status);
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'STATUS DA SOLICITAÇÃO:', colSpan: 4, styles: { halign: 'center' as const, fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold' as const, fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Status Atual:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' as const, fontSize: 8 } },
        { content: statusLabel(data.status), styles: { fillColor: statusBg, fontStyle: 'bold' as const, fontSize: 10 } },
        { content: 'Data da Solicitação:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' as const, fontSize: 8 } },
        { content: formatDateTimePTBR(data.created_at), styles: { fontSize: 9 } }
      ],
      ...(data.updated_at ? [[
        { content: 'Última Atualização:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' as const, fontSize: 8 } },
        { content: formatDateTimePTBR(data.updated_at), styles: { fontSize: 9 }, colSpan: 3 }
      ]] : [])
    ] as any[][],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'middle' as const },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35 },
      3: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Períodos de Férias ---
  const periods = normalizePeriods(data);

  const periodsBody: any[][] = periods.map((p, idx) => [
    String(idx + 1),
    formatDatePTBR(p.start_date),
    formatDatePTBR(p.end_date),
    `${p.duration} ${p.duration === 1 ? 'dia' : 'dias'}`
  ]);

  const totalDays = periods.reduce((sum, p) => sum + (p.duration || 0), 0);
  periodsBody.push([
    { content: 'TOTAL', colSpan: 3, styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: COLORS.GREY_BG } },
    { content: `${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}`, styles: { fontStyle: 'bold' as const, fillColor: COLORS.GREY_BG } }
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'PERÍODOS DE FÉRIAS SOLICITADOS:', colSpan: 4, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ], [
      'Nº', 'Data de Início', 'Data de Retorno', 'Duração'
    ]],
    body: periodsBody,
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, fontSize: 9, cellPadding: 1.5, valign: 'middle' },
    headStyles: {
      fillColor: COLORS.GREY_BG,
      textColor: COLORS.BLACK,
      halign: 'center',
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'center' },
      2: { cellWidth: 'auto', halign: 'center' },
      3: { cellWidth: 'auto', halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Opções Solicitadas ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'OPÇÕES SOLICITADAS:', colSpan: 2, styles: { halign: 'center' as const, fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold' as const, fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Abono Pecuniário (venda de 10 dias):', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' as const, fontSize: 8 } },
        { content: data.pecuniary_allowance ? 'SIM' : 'NÃO', styles: { fontStyle: 'bold' as const, fontSize: 9 } }
      ],
      [
        { content: '1ª parcela do 13º salário junto com as férias:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' as const, fontSize: 8 } },
        { content: data.advance_13th_salary ? 'SIM' : 'NÃO', styles: { fontStyle: 'bold' as const, fontSize: 9 } }
      ]
    ],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'middle' as const },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Observações do Colaborador (sempre no formulário, mesmo vazias) ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'OBSERVAÇÕES DO COLABORADOR:', styles: { halign: 'left', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [[{
      content: data.justification?.trim() || '—',
      styles: { fontSize: 9, cellPadding: 2, minCellHeight: data.justification?.trim() ? undefined : 12 }
    }]],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'top' }
  });
  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Motivo da Rejeição (se aplicável) ---
  if (data.status === 'REJECTED' && data.rejection_reason) {
    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      head: [[
        { content: 'MOTIVO DA REJEIÇÃO:', styles: { halign: 'left', fillColor: COLORS.RED_BG, textColor: COLORS.BLACK, fontStyle: 'bold', fontSize: 9 } }
      ]],
      body: [[{ content: data.rejection_reason, styles: { fontSize: 9, cellPadding: 2, fillColor: COLORS.RED_BG } }]],
      styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'top' }
    });
    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // --- Assinaturas ---
  currentY = buildSignatureSection(doc, currentY, data);

  // --- Rodapé ---
  buildFooter(doc, `Documento gerado em ${formatDateTimePTBR(new Date())} | Solicitação ID: ${data.id.slice(0, 8)}`);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Gera um formulário de férias em BRANCO (sem dados de solicitação) que
 * pode ser preenchido manualmente ou impresso para uso offline.
 */
export async function generateLeaveFormPDF(): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = getLogoBase64();
  let currentY = buildHeader(
    doc,
    logoBase64,
    'AN-RH-002',
    'Formulário de Solicitação de Férias',
    'PR-RH-01',
    'Formulário de Solicitação de Férias'
  );

  // --- Instruções ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.BLUE_HEADER[0], COLORS.BLUE_HEADER[1], COLORS.BLUE_HEADER[2]);
  doc.text('INSTRUÇÕES:', 14, currentY);
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.BLACK[0], COLORS.BLACK[1], COLORS.BLACK[2]);
  doc.setFontSize(8);
  const instrucoes = [
    '1. Preencha os campos abaixo com LETRA LEGÍVEL.',
    '2. As férias devem ser solicitadas com no mínimo 40 dias de antecedência (solicitação + processamento).',
    '3. O período mínimo de cada bloco de férias é de 5 dias (CLT).',
    '4. Se dividir as férias, um dos períodos deve ter no mínimo 14 dias (CLT).',
    '5. As férias não podem iniciar em DSR ou nos dois dias que o antecedem (Quinta, Sexta, Sábado ou Domingo).',
    '6. Após preenchido, assine e encaminhe ao seu líder/gerente para aprovação.'
  ];
  instrucoes.forEach(txt => {
    doc.text(txt, 14, currentY);
    currentY += 4;
  });
  currentY += 2;

  // --- Identificação do Solicitante (campos em branco) ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'IDENTIFICAÇÃO DO SOLICITANTE:', colSpan: 4, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Nome Completo:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '', colSpan: 3, styles: { fillColor: COLORS.YELLOW_BG, minCellHeight: 8 } }
      ],
      [
        { content: 'E-mail:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '', styles: { fillColor: COLORS.YELLOW_BG, minCellHeight: 8 } },
        { content: 'CPF:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '', styles: { fillColor: COLORS.YELLOW_BG, minCellHeight: 8 } }
      ],
      [
        { content: 'Cargo:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '', styles: { fillColor: COLORS.YELLOW_BG, minCellHeight: 8 } },
        { content: 'Setor:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '', styles: { fillColor: COLORS.YELLOW_BG, minCellHeight: 8 } }
      ],
      [
        { content: 'Data da Solicitação:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '', colSpan: 3, styles: { fillColor: COLORS.YELLOW_BG, minCellHeight: 8 } }
      ]
    ],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25 },
      3: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Períodos de Férias (3 períodos em branco) ---
  const blankPeriodRows: any[] = [];
  for (let i = 0; i < 3; i++) {
    blankPeriodRows.push([
      String(i + 1),
      '',
      '',
      ''
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'PERÍODOS DE FÉRIAS (até 3 períodos):', colSpan: 4, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ], [
      'Nº', 'Data de Início', 'Data de Retorno', 'Duração (dias)'
    ]],
    body: blankPeriodRows,
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, fontSize: 9, cellPadding: 2, valign: 'middle' },
    headStyles: {
      fillColor: COLORS.GREY_BG,
      textColor: COLORS.BLACK,
      halign: 'center',
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center', fillColor: COLORS.YELLOW_BG, minCellHeight: 10 },
      1: { cellWidth: 'auto', halign: 'center', fillColor: COLORS.YELLOW_BG, minCellHeight: 10 },
      2: { cellWidth: 'auto', halign: 'center', fillColor: COLORS.YELLOW_BG, minCellHeight: 10 },
      3: { cellWidth: 'auto', halign: 'center', fillColor: COLORS.YELLOW_BG, minCellHeight: 10 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Opções (campos em branco) ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'OPÇÕES:', colSpan: 2, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Abono Pecuniário (venda de 10 dias):', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '(  ) SIM   (  ) NÃO', styles: { fontSize: 9, fillColor: COLORS.YELLOW_BG } }
      ],
      [
        { content: '1ª parcela do 13º salário junto com as férias:', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold', fontSize: 8 } },
        { content: '(  ) SIM   (  ) NÃO', styles: { fontSize: 9, fillColor: COLORS.YELLOW_BG } }
      ]
    ],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Observações (campo em branco) ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'OBSERVAÇÕES:', styles: { halign: 'left', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [[{ content: '', styles: { minCellHeight: 25, fillColor: COLORS.YELLOW_BG } }]],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'top' }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // --- Assinaturas ---
  currentY = buildBlankSignatureSection(doc, currentY);

  // --- Rodapé ---
  buildFooter(doc, `Formulário gerado em ${formatDateTimePTBR(new Date())} | ABZ Group — Departamento Pessoal`);

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Seção de assinaturas para o comprovante (com dados).
 */
function buildSignatureSection(doc: jsPDF, currentY: number, data: LeaveRequestPDFData): number {
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'ASSINATURAS:', colSpan: 3, styles: { halign: 'center' as const, fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold' as const, fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Colaborador', styles: { halign: 'center' as const, fontStyle: 'bold' as const, fontSize: 9, fillColor: COLORS.GREY_LIGHT } },
        { content: 'Líder', styles: { halign: 'center' as const, fontStyle: 'bold' as const, fontSize: 9, fillColor: COLORS.GREY_LIGHT } },
        { content: 'Gerente', styles: { halign: 'center' as const, fontStyle: 'bold' as const, fontSize: 9, fillColor: COLORS.GREY_LIGHT } }
      ],
      [
        { content: data.user_name || '', styles: { halign: 'center' as const, fontSize: 8, minCellHeight: 18 } },
        { content: data.leader_name || '—', styles: { halign: 'center' as const, fontSize: 8, minCellHeight: 18 } },
        { content: data.manager_name || '—', styles: { halign: 'center' as const, fontSize: 8, minCellHeight: 18 } }
      ],
      [
        { content: '_______________________________________\nAssinatura', styles: { halign: 'center' as const, fontSize: 8, minCellHeight: 14 } },
        { content: '_______________________________________\nAssinatura', styles: { halign: 'center' as const, fontSize: 8, minCellHeight: 14 } },
        { content: '_______________________________________\nAssinatura', styles: { halign: 'center' as const, fontSize: 8, minCellHeight: 14 } }
      ],
      ...(data.leader_approved_at || data.manager_approved_at || data.created_at ? [[
        {
          content: data.created_at ? `Solicitado em: ${formatDatePTBR(data.created_at)}` : '—',
          styles: { halign: 'center' as const, fontSize: 7, fillColor: COLORS.GREY_LIGHT }
        },
        {
          content: data.leader_approved_at ? `Aprovado em: ${formatDatePTBR(data.leader_approved_at)}` : '—',
          styles: { halign: 'center' as const, fontSize: 7, fillColor: COLORS.GREY_LIGHT }
        },
        {
          content: data.manager_approved_at ? `Aprovado em: ${formatDatePTBR(data.manager_approved_at)}` : '—',
          styles: { halign: 'center' as const, fontSize: 7, fillColor: COLORS.GREY_LIGHT }
        }
      ]] : [])
    ] as any[][],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'middle' as const },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' }
    }
  });

  return (doc as any).lastAutoTable.finalY + 4;
}

/**
 * Seção de assinaturas em branco para o formulário.
 */
function buildBlankSignatureSection(doc: jsPDF, currentY: number): number {
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'ASSINATURAS:', colSpan: 3, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Colaborador', styles: { halign: 'center', fontStyle: 'bold', fontSize: 9, fillColor: COLORS.GREY_LIGHT } },
        { content: 'Líder', styles: { halign: 'center', fontStyle: 'bold', fontSize: 9, fillColor: COLORS.GREY_LIGHT } },
        { content: 'Gerente / DP', styles: { halign: 'center', fontStyle: 'bold', fontSize: 9, fillColor: COLORS.GREY_LIGHT } }
      ],
      [
        { content: '', styles: { minCellHeight: 20, fillColor: COLORS.YELLOW_BG } },
        { content: '', styles: { minCellHeight: 20, fillColor: COLORS.YELLOW_BG } },
        { content: '', styles: { minCellHeight: 20, fillColor: COLORS.YELLOW_BG } }
      ],
      [
        { content: '_______________________________________\nAssinatura / Data', styles: { halign: 'center', fontSize: 8, minCellHeight: 14 } },
        { content: '_______________________________________\nAssinatura / Data', styles: { halign: 'center', fontSize: 8, minCellHeight: 14 } },
        { content: '_______________________________________\nAssinatura / Data', styles: { halign: 'center', fontSize: 8, minCellHeight: 14 } }
      ]
    ],
    styles: { lineColor: COLORS.BLACK, lineWidth: 0.1, cellPadding: 1.5, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' }
    }
  });

  return (doc as any).lastAutoTable.finalY + 4;
}

/**
 * Rodapé padrão ABZ.
 */
function buildFooter(doc: jsPDF, text: string): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setDrawColor(COLORS.GREY_BG[0], COLORS.GREY_BG[1], COLORS.GREY_BG[2]);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(text, 14, pageHeight - 10);

  doc.setTextColor(COLORS.BLUE_HEADER[0], COLORS.BLUE_HEADER[1], COLORS.BLUE_HEADER[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('ABZ Group', pageWidth - 14, pageHeight - 10, { align: 'right' });
}
