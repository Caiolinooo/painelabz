import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EPIWithUser, getCAValidityLevel, CA_VALIDITY_LABELS } from '@/types/epi';

export const generateEPIReport = (registrations: EPIWithUser[], title: string = 'Relatório de EPIs') => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);

    // Table Data
    const tableData = registrations.map(reg => {
        const caLevel = getCAValidityLevel(reg.validity_date, (reg as any).ca_status);
        return [
            reg.user_name || 'N/A',
            reg.equipment_type,
            reg.quantity,
            reg.equipment_ca || '-',
            reg.validity_date ? new Date(reg.validity_date).toLocaleDateString('pt-BR') : '-',
            CA_VALIDITY_LABELS[caLevel],
            reg.status === 'delivered' ? 'Entregue' :
                reg.status === 'approved' ? 'Aprovado' :
                    reg.status === 'pending' ? 'Pendente' :
                        reg.status === 'rejected' ? 'Reprovado' : reg.status,
            reg.delivered_at ? new Date(reg.delivered_at).toLocaleDateString('pt-BR') : '-'
        ];
    });

    // Table
    autoTable(doc, {
        startY: 35,
        head: [['Colaborador', 'Equipamento', 'Qtd', 'CA', 'Validade', 'Status CA', 'Status', 'Entregue Em']],
        body: tableData,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 128, 185] },
        columnStyles: {
            5: { // Status CA column
                cellWidth: 22,
            }
        },
        didParseCell: function (data: any) {
            // Color the Status CA cells
            if (data.section === 'body' && data.column.index === 5) {
                const val = data.cell.raw;
                if (val === 'CA Vencido') {
                    data.cell.styles.textColor = [220, 38, 38]; // red
                } else if (val === 'CA Próximo de Vencer') {
                    data.cell.styles.textColor = [202, 138, 4]; // yellow
                } else if (val === 'CA Válido') {
                    data.cell.styles.textColor = [22, 163, 74]; // green
                }
            }
        }
    });

    // Save
    doc.save(`epi-report-${Date.now()}.pdf`);
};

