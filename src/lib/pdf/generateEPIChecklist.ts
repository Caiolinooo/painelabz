/**
 * Generate official ABZ Group EPI/Uniformes Ficha (AN-HSE-005)
 * PDF format matching the company standard with:
 * - ABZ Group header with document codes
 * - Employee info (name, position, project)
 * - Legal terms (TERMO DE RESPONSABILIDADE E CIÊNCIA)
 * - Delivery table with EPI items, CA, validity, signature
 * - Signature area
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EPIWithUser, getCAValidityLevel } from '@/types/epi';

interface FichaData {
    employeeName: string;
    employeePosition: string;
    employeeProject?: string;
    registrations: EPIWithUser[];
    signatureUrl?: string;
    signatureDate?: string;
}

export async function generateEPIChecklist(
    registrations: EPIWithUser[],
    userName: string,
    userRole: string,
    userSector: string,
    signatureUrl?: string
) {
    return generateFichaEPI({
        employeeName: userName,
        employeePosition: userRole,
        employeeProject: userSector,
        registrations,
        signatureUrl,
    });
}

export async function generateFichaEPI(data: FichaData) {
    const { employeeName, employeePosition, employeeProject, registrations, signatureUrl, signatureDate } = data;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // ==================== HEADER ====================
    // ABZ Group logo area
    doc.setFillColor(0, 51, 102); // Dark blue
    doc.rect(margin, margin, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('abz group', margin + 4, margin + 6);
    doc.setTextColor(0, 0, 0);

    // Document info box
    const headerY = margin + 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);

    // Row 1: ANEXO/ANNEX | COD | REV
    doc.setFillColor(255, 204, 0); // Yellow
    doc.rect(margin, headerY, contentWidth * 0.5, 6, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('ANEXO / ANNEX', margin + 2, headerY + 4);

    doc.rect(margin + contentWidth * 0.5, headerY, contentWidth * 0.35, 6, 'D');
    doc.setFont('helvetica', 'normal');
    doc.text('COD.: AN-HSE-005', margin + contentWidth * 0.5 + 2, headerY + 4);

    doc.rect(margin + contentWidth * 0.85, headerY, contentWidth * 0.15, 6, 'D');
    doc.text('REV.: 1', margin + contentWidth * 0.85 + 2, headerY + 4);

    // Row 2: Ficha de EPI | Proc. Ref | PAG
    const row2Y = headerY + 6;
    doc.rect(margin, row2Y, contentWidth * 0.5, 6, 'D');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Ficha de EPI / Uniformes', margin + 2, row2Y + 4.5);

    doc.rect(margin + contentWidth * 0.5, row2Y, contentWidth * 0.35, 6, 'D');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Proc. Ref.: PR-HSE-04', margin + contentWidth * 0.5 + 2, row2Y + 4);

    doc.rect(margin + contentWidth * 0.85, row2Y, contentWidth * 0.15, 6, 'D');
    doc.text(`Data: ${formatDateBR(new Date())}`, margin + contentWidth * 0.85 + 2, row2Y + 4);

    // Row 3: Applicable to
    const row3Y = row2Y + 6;
    doc.rect(margin, row3Y, contentWidth, 6, 'D');
    doc.setFontSize(7);
    doc.text('Aplicável a / Applicable to: ( X ) Brasil    ( ) International', margin + 2, row3Y + 4);

    // ==================== EMPLOYEE INFO ====================
    const empY = row3Y + 8;
    doc.setFillColor(240, 240, 240);

    // Employee name
    const nameBoxW = contentWidth * 0.5;
    const cargoBoxW = contentWidth * 0.25;
    const projBoxW = contentWidth * 0.25;

    // Header row (dark golden background like the original template)
    doc.setFillColor(204, 153, 0);
    doc.rect(margin, empY, nameBoxW, 6, 'FD');
    doc.rect(margin + nameBoxW, empY, cargoBoxW, 6, 'FD');
    doc.rect(margin + nameBoxW + cargoBoxW, empY, projBoxW, 6, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('NOME COMPLETO DO FUNCIONÁRIO:', margin + 2, empY + 4);
    doc.text('CARGO:', margin + nameBoxW + 2, empY + 4);
    doc.text('PROJETO:', margin + nameBoxW + cargoBoxW + 2, empY + 4);
    doc.setTextColor(0, 0, 0);

    // Data row
    const empDataY = empY + 6;
    doc.rect(margin, empDataY, nameBoxW, 7, 'D');
    doc.rect(margin + nameBoxW, empDataY, cargoBoxW, 7, 'D');
    doc.rect(margin + nameBoxW + cargoBoxW, empDataY, projBoxW, 7, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(employeeName || '', margin + 2, empDataY + 5);
    doc.text(employeePosition || '', margin + nameBoxW + 2, empDataY + 5);
    doc.text(employeeProject || '', margin + nameBoxW + cargoBoxW + 2, empDataY + 5);

    // ==================== LEGAL TERMS ====================
    const legalY = empDataY + 10;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, legalY, contentWidth, 40, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMO DE RESPONSABILIDADE E CIÊNCIA', margin + 2, legalY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    const legalText = [
        'Pelo presente declaro que recebi da empresa ABZ Group, o material especificado abaixo, em conformidade com o estabelecido Ordem de Serviço (NR-1) e assumindo o',
        'compromisso, definido no item 6.7.1, da NR-6 de:',
        'a) usar, utilizando-o apenas para a finalidade a que se destina;',
        'b) responsabilizar-se pela guarda e conservação;',
        'c) comunicar ao empregador qualquer alteração que o torne impróprio para uso; e',
        'd) cumprir as determinações do empregador sobre o uso adequado.',
        'Declaro ainda que fui orientado e treinado pela empresa no que se refere ao uso adequado, guarda e conservação conforme item 6.6.1 da NR-6.',
        'Em caso de perda, extravio ou inutilização proposital do material recebido, autorizo, na forma prevista no parágrafo primeiro do artigo 462 da CLT, a descontar de meu',
        'salário/rescisão de contrato, a importância correspondente ao valor do material.',
    ];

    let legalLineY = legalY + 8;
    for (const line of legalText) {
        doc.text(line, margin + 2, legalLineY);
        legalLineY += 3;
    }

    // "De acordo:" and date line
    doc.setFontSize(7);
    doc.text('De acordo:', margin + 2, legalLineY + 2);

    const dateLineY = legalLineY + 6;
    doc.line(margin + contentWidth * 0.2, dateLineY, margin + contentWidth * 0.5, dateLineY);
    doc.text(`Data: ${signatureDate || '____/____/______'}`, margin + contentWidth * 0.2 + 5, dateLineY - 1);

    // ==================== DELIVERY TABLE ====================
    const tableStartY = legalY + 44;

    const tableData = registrations.map(reg => {
        const caLevel = getCAValidityLevel(reg.ca_validity_date || reg.validity_date, reg.ca_status);
        const deliveryDate = reg.delivered_at
            ? formatDateBR(new Date(reg.delivered_at))
            : (reg.created_at ? formatDateBR(new Date(reg.created_at)) : '');

        return [
            deliveryDate,
            reg.quantity || 1,
            reg.equipment_type || '',
            '', // Signature column (left blank for physical signature)
            reg.equipment_ca || 'NA',
            reg.ca_validity_date
                ? formatDateBR(new Date(reg.ca_validity_date))
                : (reg.validity_date ? formatDateBR(new Date(reg.validity_date)) : 'NA'),
        ];
    });

    // Add empty rows to reach at least 15 rows (for the ficha look)
    while (tableData.length < 15) {
        tableData.push(['', '', '', '', '', '']);
    }

    autoTable(doc, {
        startY: tableStartY,
        head: [['Data da entrega', 'Qtd./Unid.', 'EPI/Material + Fabricante / Marca', 'Assinatura/Rubrica', 'CA', 'Validade CA']],
        body: tableData,
        theme: 'grid',
        styles: {
            fontSize: 7,
            cellPadding: 1.5,
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center',
        },
        columnStyles: {
            0: { cellWidth: 25, halign: 'center' },  // Data
            1: { cellWidth: 18, halign: 'center' },   // Qtd
            2: { cellWidth: contentWidth * 0.38 },    // EPI/Material
            3: { cellWidth: contentWidth * 0.2 },     // Assinatura
            4: { cellWidth: 18, halign: 'center' },   // CA
            5: { cellWidth: 25, halign: 'center' },   // Validade CA
        },
        didParseCell: function (hookData: any) {
            // Color CA column based on validity
            if (hookData.section === 'body' && hookData.column.index === 5) {
                const val = String(hookData.cell.raw || '');
                if (val && val !== 'NA' && val !== '') {
                    const parts = val.split('/');
                    if (parts.length === 3) {
                        const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        if (!isNaN(date.getTime()) && date <= new Date()) {
                            hookData.cell.styles.textColor = [220, 38, 38]; // Red for expired
                        }
                    }
                }
            }
        },
    });

    // ==================== SIGNATURE ====================
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    if (signatureUrl) {
        try {
            doc.setFontSize(7);
            doc.text('Assinatura Digital do Colaborador:', margin, finalY);
            doc.addImage(signatureUrl, 'PNG', margin, finalY + 2, 50, 20);
        } catch (e) {
            console.error('Error loading signature image:', e);
            doc.text('(Assinatura digital registrada no sistema)', margin, finalY + 8);
        }
    }

    // ==================== FOOTER ====================
    doc.setFontSize(6);
    doc.setTextColor(128, 128, 128);
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text('Portal ABZ - Gestão de EPIs | AN-HSE-005', margin, pageHeight - 5);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }
    doc.setTextColor(0, 0, 0);

    // Save
    const filename = `Ficha_EPI_${employeeName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(filename);
}

// ==================== HELPER ====================
function formatDateBR(date: Date): string {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
