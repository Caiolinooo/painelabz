import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EPIWithUser } from '@/types/epi';

export async function generateEPIChecklist(
    registrations: EPIWithUser[],
    userName: string,
    userRole: string,
    userSector: string,
    signatureUrl?: string
) {
    const doc = new jsPDF();
    const logoUrl = '/logo-abz.png'; // Make sure this exists or use a base64 placeholder if needed

    // --- Header ---
    doc.setFontSize(16);
    doc.text('FICHA DE ENTREGA DE EPI', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text('Termo de Responsabilidade e Recibo de Entrega', 105, 28, { align: 'center' });

    // --- Employee Info ---
    doc.setFontSize(11);
    doc.text(`Colaborador: ${userName}`, 14, 45);
    doc.text(`Função/Cargo: ${userRole}`, 14, 52);
    doc.text(`Setor: ${userSector}`, 14, 59);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 140, 45);

    // --- Disclaimer ---
    doc.setFontSize(9);
    const disclaimerObj = doc.splitTextToSize(
        "Declaro ter recebido os Equipamentos de Proteção Individual (EPI) abaixo relacionados, em perfeito estado de conservação e funcionamento. Comprometo-me a utilizá-los apenas para as finalidades a que se destinam, zelando pela sua guarda e conservação, comunicando imediatamente qualquer alteração que os tornem impróprios para uso, bem como a devolvê-los quando solicitado ou em caso de rescisão contratual.",
        180
    );
    doc.text(disclaimerObj, 14, 70);

    // --- Table ---
    const tableData = registrations.map(reg => [
        reg.equipment_type,
        reg.quantity,
        reg.reason,
        reg.equipment_ca || 'N/A', // CA Number
        new Date(reg.delivered_at || new Date()).toLocaleDateString('pt-BR'),
        'Recebido'
    ]);

    autoTable(doc, {
        startY: 95,
        head: [['Equipamento', 'Qtd', 'Motivo', 'CA', 'Data Entrega', 'Situação']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] }, // Green-600
        styles: { fontSize: 10 }
    });

    // --- Signature ---
    const finalY = (doc as any).lastAutoTable.finalY + 20;

    doc.text('Assinatura do Colaborador:', 14, finalY);

    if (signatureUrl) {
        try {
            // Need to fetch base64 from URL because jsPDF addImage needs base64/dataurl
            // Or if it's a public URL, we might need a proxy or confirm CORS
            // For now, assuming we might need to handle image loading.
            // Simplified: display placeholder or try to load if CORS allows.

            // In a real app, you might fetch the image blob and convert to base64 here
            // const imgData = await fetch(signatureUrl).then(res => res.arrayBuffer());
            // doc.addImage(imgData, 'PNG', 14, finalY + 5, 50, 20);

            // For now, let's just mark it as "Signed Digitally"
            doc.addImage(signatureUrl, 'PNG', 14, finalY + 5, 60, 30);
        } catch (e) {
            console.error('Error loading signature image', e);
            doc.text('(Erro ao carregar imagem da assinatura digital)', 14, finalY + 15);
        }
    } else {
        doc.line(14, finalY + 25, 100, finalY + 25);
    }

    // --- Footer ---
    doc.setFontSize(8);
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text('Painel ABZ - Gestão de EPIs', 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
    }

    doc.save(`Ficha_EPI_${userName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}
