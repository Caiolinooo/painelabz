
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

// --- Configuration & Constants ---
// Define Tuple types for jsPDF
type ColorTuple = [number, number, number];

const COLORS = {
  BLUE_HEADER: [0, 80, 239] as ColorTuple,    // Vibrant Blue #0050ef
  YELLOW_BG: [255, 255, 0] as ColorTuple,     // Bright Yellow #ffff00
  RED_TEXT: [255, 0, 0] as ColorTuple,        // Red #ff0000
  GREY_BG: [220, 220, 220] as ColorTuple,     // Light grey #dcdcdc
  WHITE: [255, 255, 255] as ColorTuple,
  BLACK: [0, 0, 0] as ColorTuple
};

const FORMAT_CURRENCY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const bitmap = fs.readFileSync(logoPath);
      return `data:image/png;base64,${bitmap.toString('base64')}`;
    }
  } catch (error) {
    console.warn('Logo not found:', error);
  }
  return '';
}

interface ReimbursementData {
  id: string;
  created_at: string;
  valor: number;
  descricao: string;
  status: string;
  user_email?: string;
  user_name?: string;
  cpf?: string;
  manager_name?: string;
  department?: string;
  category?: string;
  items?: Array<{
    date: string;
    description: string;
    amount: number;
    category?: string;
  }>;
  // Payment Info
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  pix_chave?: string | null;
  pix_tipo?: string | null;
}

export async function generateReimbursementPDF(data: ReimbursementData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoBase64 = getLogoBase64();
  let currentY = 10;

  // --- 1. HEADER (Logo + Doc Info) ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [],
    body: [
      [
        {
          content: '',
          rowSpan: 4,
          styles: { minCellHeight: 25, valign: 'middle', halign: 'center' }
        },
        {
          content: 'ANEXO / ANNEX',
          styles: { fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'left', fontSize: 8, cellPadding: 1 }
        },
        {
          content: 'COD.: AN-FIN-006',
          styles: { halign: 'left', fontStyle: 'bold', textColor: COLORS.BLUE_HEADER, fontSize: 8, cellPadding: 1 }
        }
      ],
      [
        {
          content: 'Relatório para Reembolso de Despesas',
          rowSpan: 2,
          styles: { valign: 'middle', fontSize: 13, fontStyle: 'bold', halign: 'left', textColor: COLORS.BLACK }
        },
        { content: 'Proc. Ref.: PR-FIN-02', styles: { fontSize: 7, valign: 'middle', halign: 'left' } }
      ],
      [
        { content: 'REV.: 0', styles: { fontSize: 7, valign: 'middle', halign: 'left' } }
      ],
      [
        { content: 'Aplicável a / Applicable to: ( X ) Brasil   (   ) International', styles: { fontSize: 7, valign: 'middle', halign: 'left' } },
        // HARDCODED DATE HERE AS REQUESTED
        { content: 'Data/ Date: 03/02/2025    PAG.: 1', styles: { fontSize: 7, valign: 'middle', halign: 'left' } }
      ]
    ],
    columnStyles: {
      0: { cellWidth: 50 }, // Logo area
      1: { cellWidth: 100 }, // Title/Applicable area
      2: { cellWidth: 40 }   // Code/Rev/Page area
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      fontSize: 9,
      textColor: COLORS.BLACK,
      cellPadding: 1,
      overflow: 'hidden'
    },
    didDrawCell: (data) => {
      // Image centering logic
      if (data.section === 'body' && data.column.index === 0 && data.row.index === 0 && logoBase64) {
        const cellHeight = data.cell.height;
        const imgHeight = 12; // approximate height in mm
        const imgWidth = 40;  // approximate width in mm

        const xPos = data.cell.x + (data.cell.width - imgWidth) / 2;
        const yPos = data.cell.y + (cellHeight - imgHeight) / 2;

        doc.addImage(logoBase64, 'PNG', xPos, yPos, imgWidth, imgHeight);
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4; // Increased spacing

  // --- 2. WARNINGS & INSTRUCTIONS ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.RED_TEXT[0], COLORS.RED_TEXT[1], COLORS.RED_TEXT[2]);
  doc.text('ATENÇÃO! PREENCHER SOMENTE AS CÉLULAS NA COR AMARELA!!', 14, currentY);

  currentY += 4;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.BLUE_HEADER[0], COLORS.BLUE_HEADER[1], COLORS.BLUE_HEADER[2]);
  doc.text('OFFSHORE/EXTERNO:', 14, currentY);
  doc.setTextColor(COLORS.BLACK[0], COLORS.BLACK[1], COLORS.BLACK[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(' enviar os comprovantes junto com a planilha para logistica@groupabz.com / thamires.pinheiro@groupabz.com', 52, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.BLUE_HEADER[0], COLORS.BLUE_HEADER[1], COLORS.BLUE_HEADER[2]);
  doc.text('ABZ Escritório:', 14, currentY);
  doc.setTextColor(COLORS.BLACK[0], COLORS.BLACK[1], COLORS.BLACK[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(' enviar os comprovantes junto com a planilha para aprovação do gestor, com cópia para fiscal@abzgroup.com', 42, currentY);

  currentY += 3;

  // --- 3. IDENTIFICATION SECTION ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'IDENTIFICAÇÃO DO REQUISITANTE:', colSpan: 3, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      ['NOME COMPLETO:', 'LOCAL DE TRABALHO:', 'CPF:'],
      [
        { content: data.user_name || data.user_email || '', styles: { fillColor: COLORS.YELLOW_BG, fontStyle: 'normal' } },
        { content: data.department || 'ABZ Base', styles: { fillColor: COLORS.YELLOW_BG, fontStyle: 'normal' } },
        { content: data.cpf || '', styles: { fillColor: COLORS.YELLOW_BG } }
      ]
    ],
    styles: {
      lineColor: COLORS.BLACK,
      lineWidth: 0.1,
      fontSize: 8,
      textColor: COLORS.BLACK,
      cellPadding: 1,
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold', fillColor: COLORS.GREY_BG },
      1: { cellWidth: 60, fontStyle: 'bold', fillColor: COLORS.GREY_BG },
      2: { cellWidth: 'auto', fontStyle: 'bold', fillColor: COLORS.GREY_BG }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.fillColor = COLORS.GREY_BG;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY - 0.1;

  // --- 4. PAYMENT INFO SECTION ---
  const pixText = data.pix_chave
    ? `PIX (${data.pix_tipo || 'Chave'}): ${data.pix_chave}`
    : 'PIX (caso preencha o pix, não será necessário preencher os dados bancários abaixo):';

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'INFORMAÇÕES PARA RECEBIMENTO:', colSpan: 7, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      // Row 1: PIX
      [
        { content: 'PIX (caso preencha o pix, não será necessário preencher os dados bancários abaixo):', colSpan: 4, styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' } },
        { content: data.pix_chave ? `PIX - ${data.pix_tipo || 'Chave'}: ${data.pix_chave}` : '', colSpan: 3, styles: { fillColor: COLORS.YELLOW_BG, fontStyle: 'bold' } }
      ],
      // Row 2: Bank Details
      [
        { content: 'DADOS BANCÁRIOS', styles: { fillColor: COLORS.GREY_BG, halign: 'center', valign: 'middle', fontStyle: 'bold' } },
        { content: 'Banco:', styles: { fillColor: COLORS.GREY_BG, halign: 'right', fontStyle: 'bold' } },
        { content: data.banco || '', styles: { fillColor: COLORS.YELLOW_BG } },
        { content: 'Agência:', styles: { fillColor: COLORS.GREY_BG, halign: 'right', fontStyle: 'bold' } },
        { content: data.agencia || '', styles: { fillColor: COLORS.YELLOW_BG } },
        { content: 'Conta Corrente:', styles: { fillColor: COLORS.GREY_BG, halign: 'right', fontStyle: 'bold' } },
        { content: data.conta || '', styles: { fillColor: COLORS.YELLOW_BG } },
      ]
    ],
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 15 },
      2: { cellWidth: 40 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 30 },
      6: { cellWidth: 'auto' }
    },
    styles: {
      lineColor: COLORS.BLACK,
      lineWidth: 0.1,
      fontSize: 8,
      textColor: COLORS.BLACK,
      cellPadding: 1,
      valign: 'middle'
    }
  });

  currentY = (doc as any).lastAutoTable.finalY - 0.1;

  // --- 5. EXPENSES GRID ---

  const items = data.items && data.items.length > 0
    ? data.items
    : [{
      date: data.created_at,
      description: data.descricao,
      amount: data.valor,
      category: data.category
    }];

  const tableBody = items.map(item => [
    item.category || 'Outros',
    formatDate(item.date),
    item.description,
    FORMAT_CURRENCY.format(item.amount),
    '' // US$ Value empty
  ]);

  while (tableBody.length < 12) {
    tableBody.push(['', '', '', '', '']);
  }

  const total = items.reduce((acc, curr) => acc + Number(curr.amount), 0);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      'FORNECEDOR', 'DATA', 'DESCRIÇÃO DOS GASTOS', 'VALOR (R$)', 'VALOR (US$)'
    ]],
    body: tableBody,
    styles: {
      lineColor: COLORS.BLACK,
      lineWidth: 0.1,
      fontSize: 8,
      textColor: COLORS.BLACK,
      cellPadding: 1.5
    },
    headStyles: {
      fillColor: COLORS.GREY_BG,
      textColor: COLORS.BLACK,
      halign: 'center',
      fontStyle: 'bold',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }
    },
    bodyStyles: {
      fillColor: COLORS.YELLOW_BG
    }
  });

  currentY = (doc as any).lastAutoTable.finalY - 0.1;

  // --- 6. FOOTER TOTALS ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    body: [
      [
        { content: 'SUB-TOTAL DESPESAS', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: FORMAT_CURRENCY.format(total), styles: { halign: 'right', fontStyle: 'bold', fillColor: COLORS.GREY_BG, cellWidth: 25 } },
        { content: 'R$ 0,00', styles: { halign: 'right', fontStyle: 'bold', fillColor: COLORS.GREY_BG, cellWidth: 25 } }
      ],
      [
        { content: 'ADIANTAMENTO (SE APLICÁVEL)', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: '', styles: { fillColor: COLORS.WHITE } },
        { content: '', styles: { fillColor: COLORS.WHITE } }
      ],
      [
        { content: 'TOTAL A SER DEPOSITADO', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: FORMAT_CURRENCY.format(total), styles: { halign: 'right', fontStyle: 'bold', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE } },
        { content: 'R$ 0,00', styles: { halign: 'right', fontStyle: 'bold', fillColor: COLORS.GREY_BG } }
      ]
    ],
    styles: {
      lineColor: COLORS.BLACK,
      lineWidth: 0.1,
      fontSize: 8,
      cellPadding: 1,
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 'auto' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 2;

  // --- 7. APPROVAL FOOTER ---
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [[
      { content: 'PARA PREENCHIMENTO DA ABZ GROUP', colSpan: 2, styles: { halign: 'center', fillColor: COLORS.BLUE_HEADER, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 } }
    ]],
    body: [
      [
        { content: 'Todos os comprovantes foram anexados?   ( X ) SIM    (   ) NÃO', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' } },
        { content: 'Data do Recebimento Documentos: ____/____/_______', styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' } }
      ],
      [
        { content: 'Verificado por (Double Check):', styles: { fillColor: COLORS.GREY_BG, minCellHeight: 12, fontStyle: 'bold' } },
        { content: 'Aprovado por:\n\n' + (data.manager_name || ''), styles: { fillColor: COLORS.GREY_BG, fontStyle: 'bold' } }
      ],
      [
        { content: `Observação: Protocolo ${data.id.slice(0, 8).toUpperCase()}`, colSpan: 2, styles: { fillColor: COLORS.GREY_BG, minCellHeight: 10 } }
      ]
    ],
    styles: {
      lineColor: COLORS.BLACK,
      lineWidth: 0.1,
      fontSize: 8,
      textColor: COLORS.BLACK,
      cellPadding: 1.5,
      valign: 'middle'
    }
  });

  return Buffer.from(doc.output('arraybuffer'));
}
