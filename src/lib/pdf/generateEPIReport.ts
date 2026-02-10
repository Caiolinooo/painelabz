import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EPIWithUser } from '@/types/epi';

export const generateEPIReport = (registrations: EPIWithUser[], title: string = 'Relatório de EPIs') => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);

    // Table Data
    const tableData = registrations.map(reg => [
        reg.user_name || 'N/A',
        reg.equipment_type,
        reg.quantity,
        reg.equipment_ca || '-',
        reg.validity_date ? new Date(reg.validity_date).toLocaleDateString('pt-BR') : '-',
        reg.status === 'delivered' ? 'Entregue' :
            reg.status === 'approved' ? 'Aprovado' :
                reg.status === 'pending' ? 'Pendente' :
                    reg.status === 'rejected' ? 'Reprovado' : reg.status,
        reg.delivered_at ? new Date(reg.delivered_at).toLocaleDateString('pt-BR') : '-'
    ]);

    // Table
    autoTable(doc, {
        startY: 35,
        head: [['Colaborador', 'Equipamento', 'Qtd', 'CA', 'Validade', 'Status', 'Entregue Em']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
    });

    // Save
    doc.save(`epi-report-${Date.now()}.pdf`);
};
