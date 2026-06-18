import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EPIStockWithType, EPIStockMovement } from '@/types/epi';

interface StockReportOptions {
    title?: string;
    reportType: 'all' | 'low_stock' | 'movements';
    startDate?: string;
    endDate?: string;
    includeMovements: boolean;
}

const MOVEMENT_LABELS: Record<string, string> = {
    entry: 'Entrada',
    exit: 'Saída',
    adjustment: 'Ajuste',
    return: 'Devolução',
};

export const generateEPIStockReport = (
    stocks: EPIStockWithType[],
    movements: EPIStockMovement[],
    options: StockReportOptions
) => {
    const doc = new jsPDF();
    const title = options.title || 'Relatório de Estoque de EPI';

    // Header Title
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41); // Dark charcoal
    doc.text(title, 14, 20);

    // Generation Time
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125); // Slate gray
    const nowStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR');
    doc.text(`Gerado em: ${nowStr}`, 14, 27);

    // Filters Subtitle
    const subtitleParts = [];
    if (options.reportType === 'low_stock') {
        subtitleParts.push('Filtro: Apenas Estoque Baixo (Abaixo do Mínimo)');
    } else if (options.reportType === 'movements') {
        subtitleParts.push('Filtro: Histórico de Movimentações');
    } else {
        subtitleParts.push('Filtro: Todos os Itens em Estoque');
    }

    if (options.includeMovements && (options.startDate || options.endDate)) {
        const start = options.startDate ? new Date(options.startDate).toLocaleDateString('pt-BR') : 'Início';
        const end = options.endDate ? new Date(options.endDate).toLocaleDateString('pt-BR') : 'Fim';
        subtitleParts.push(`Período de Movimentações: ${start} a ${end}`);
    }

    doc.setFontSize(9);
    doc.text(subtitleParts.join(' | '), 14, 33);

    // General Summary Stats
    const totalItems = stocks.reduce((sum, s) => sum + s.current_quantity, 0);
    const lowStockCount = stocks.filter(s => s.is_low_stock).length;

    doc.setFontSize(10);
    doc.setTextColor(33, 37, 41);
    doc.text(`Resumo: ${stocks.length} tipos de EPI monitorados | Total em estoque: ${totalItems} unidades | Itens com estoque baixo: ${lowStockCount}`, 14, 42);

    let currentY = 48;

    // Table 1: Stock Levels (if not only movements report type)
    if (options.reportType !== 'movements') {
        doc.setFontSize(12);
        doc.text('Níveis de Estoque Atuais', 14, currentY);
        currentY += 4;

        const filteredStocks = options.reportType === 'low_stock' 
            ? stocks.filter(s => s.is_low_stock)
            : stocks;

        const stockBody = filteredStocks.map(s => [
            s.epi_type?.name || 'N/A',
            s.epi_type?.category || '-',
            s.epi_type?.ca_number || '-',
            s.epi_type?.ca_validity_date ? new Date(s.epi_type.ca_validity_date).toLocaleDateString('pt-BR') : '-',
            s.current_quantity,
            s.minimum_quantity,
            s.is_low_stock ? 'Abaixo do Mínimo' : 'Regular',
            s.location || '-'
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Tipo de EPI', 'Categoria', 'CA', 'Validade CA', 'Qtd Atual', 'Qtd Mínima', 'Status', 'Local de Armazenamento']],
            body: stockBody,
            styles: { fontSize: 7.5 },
            headStyles: { fillColor: [41, 128, 185] }, // Nice Blue
            didParseCell: function (data: any) {
                if (data.section === 'body' && data.column.index === 6) {
                    const val = data.cell.raw;
                    if (val === 'Abaixo do Mínimo') {
                        data.cell.styles.textColor = [220, 38, 38]; // Bold red
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [22, 163, 74]; // Green
                    }
                }
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // Table 2: Movements
    if (options.includeMovements || options.reportType === 'movements') {
        // Ensure there is enough space on page or add page
        if (currentY > 220) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(33, 37, 41);
        doc.text('Histórico de Movimentações', 14, currentY);
        currentY += 4;

        if (movements.length === 0) {
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.text('Nenhuma movimentação registrada no período selecionado.', 14, currentY);
        } else {
            const movementBody = movements.map(m => {
                const dateStr = new Date(m.created_at).toLocaleDateString('pt-BR') + ' ' + 
                    new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const typeLabel = MOVEMENT_LABELS[m.movement_type] || m.movement_type;
                let qtyPrefix = '';
                if (m.movement_type === 'exit') qtyPrefix = '-';
                else if (m.movement_type === 'entry' || m.movement_type === 'return') qtyPrefix = '+';

                return [
                    dateStr,
                    typeLabel,
                    m.epi_type_name || '-',
                    `${qtyPrefix}${m.quantity}`,
                    `${m.previous_quantity} → ${m.new_quantity}`,
                    m.reason || '-',
                    m.performer_name || 'Sistema'
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head: [['Data/Hora', 'Tipo', 'EPI', 'Qtd', 'Saldo', 'Motivo', 'Operador']],
                body: movementBody,
                styles: { fontSize: 7.5 },
                headStyles: { fillColor: [100, 110, 120] }, // Gray-blue
                didParseCell: function (data: any) {
                    if (data.section === 'body' && data.column.index === 1) {
                        const val = data.cell.raw;
                        if (val === 'Saída') {
                            data.cell.styles.textColor = [220, 38, 38]; // red
                        } else if (val === 'Entrada' || val === 'Devolução') {
                            data.cell.styles.textColor = [22, 163, 74]; // green
                        } else {
                            data.cell.styles.textColor = [41, 128, 185]; // blue
                        }
                    }
                }
            });
        }
    }

    // Save File
    const fileSuffix = options.reportType === 'low_stock' ? 'estoque-baixo' : 
                       options.reportType === 'movements' ? 'movimentacoes' : 'estoque-geral';
    doc.save(`relatorio-epi-${fileSuffix}-${Date.now()}.pdf`);
};
