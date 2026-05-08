import jsPDF from 'jspdf';

interface ParticipantData {
    nome_completo: string;
    funcao: string | null;
    empresa: string | null;
    assinatura_url: string;
    created_at: string;
}

interface ListaData {
    titulo: string;
    data_evento: string;
    hora_inicio: string | null;
    hora_fim: string | null;
    local: string | null;
    pauta: string | null;
    criador_nome?: string;
}

/**
 * Generate PDF for Lista de Presença — Word-style layout.
 * Always renders real handwritten signatures.
 */
export async function generateListaPresencaPDF(
    lista: ListaData,
    participantes: ParticipantData[]
): Promise<jsPDF> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // ===== HEADER =====
    // Try to load logo (preserving aspect ratio)
    try {
        const logoRes = await fetch('/images/logo.png');
        const logoBlob = await logoRes.blob();
        const logoBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
        });

        // Read intrinsic dimensions to preserve aspect ratio
        const logoDims = await new Promise<{ w: number; h: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => resolve({ w: 4.2, h: 1 }); // fallback ratio
            img.src = logoBase64;
        });

        const logoWidth = 35;
        const logoHeight = logoWidth * (logoDims.h / logoDims.w);
        doc.addImage(logoBase64, 'PNG', margin, 10, logoWidth, logoHeight);
    } catch {
        // No logo, continue
    }

    // Title  
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE PRESENÇA', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('ATTENDANCE LIST', pageWidth / 2, 23, { align: 'center' });

    // Horizontal line
    doc.setDrawColor(0, 102, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, 27, pageWidth - margin, 27);

    // ===== EVENT INFO =====
    let y = 33;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 51, 51);

    const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatTime = (t: string | null) => t ? t.slice(0, 5) : '';

    // Left column
    doc.text('Evento / Event:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(lista.titulo, margin + 30, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Data / Date:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(lista.data_evento), margin + 25, y);

    if (lista.hora_inicio) {
        doc.setFont('helvetica', 'bold');
        doc.text('Horário / Time:', 100, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${formatTime(lista.hora_inicio)}${lista.hora_fim ? ' – ' + formatTime(lista.hora_fim) : ''}`, 130, y);
    }
    y += 5;

    if (lista.local) {
        doc.setFont('helvetica', 'bold');
        doc.text('Local / Location:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(lista.local, margin + 32, y);
        y += 5;
    }

    if (lista.pauta) {
        doc.setFont('helvetica', 'bold');
        doc.text('Pauta / Subject:', margin, y);
        doc.setFont('helvetica', 'normal');
        
        // Available width after the label
        const pautaX = margin + 30;
        const pautaMaxWidth = contentWidth - 30;
        
        // Split the pauta into properly wrapped lines
        const pautaLines = doc.splitTextToSize(lista.pauta, pautaMaxWidth);
        
        // Render each line
        for (let i = 0; i < pautaLines.length; i++) {
            doc.text(pautaLines[i], pautaX, y);
            if (i < pautaLines.length - 1) {
                y += 4;
            }
        }
        y += 4;
    }

    y += 3;

    // ===== TABLE HEADER =====
    const colNum = { x: margin, w: 8 };
    const colName = { x: margin + 8, w: 52 };
    const colRole = { x: margin + 60, w: 30 };
    const colCompany = { x: margin + 90, w: 30 };
    const colSignature = { x: margin + 120, w: 50 };
    const colTime = { x: margin + 170, w: 23 };
    const rowHeight = 18;

    // Header background
    doc.setFillColor(0, 102, 255);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    const headerY = y + 5;
    doc.text('#', colNum.x + 1, headerY);
    doc.text('Nome / Name', colName.x + 1, headerY);
    doc.text('Função / Role', colRole.x + 1, headerY);
    doc.text('Empresa / Company', colCompany.x + 1, headerY);
    doc.text('Assinatura / Signature', colSignature.x + 1, headerY);
    doc.text('Hora', colTime.x + 1, headerY);
    y += 7;

    // ===== TABLE ROWS =====
    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    for (let i = 0; i < participantes.length; i++) {
        // Check page break
        if (y + rowHeight > 280) {
            doc.addPage();
            y = 15;
            // Repeat header on new page
            doc.setFillColor(0, 102, 255);
            doc.rect(margin, y, contentWidth, 7, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            const hy = y + 5;
            doc.text('#', colNum.x + 1, hy);
            doc.text('Nome / Name', colName.x + 1, hy);
            doc.text('Função / Role', colRole.x + 1, hy);
            doc.text('Empresa / Company', colCompany.x + 1, hy);
            doc.text('Assinatura / Signature', colSignature.x + 1, hy);
            doc.text('Hora', colTime.x + 1, hy);
            y += 7;
            doc.setTextColor(51, 51, 51);
            doc.setFont('helvetica', 'normal');
        }

        const p = participantes[i];
        const rowY = y;
        const textY = rowY + 6;

        // Alternating row bg
        if (i % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, rowY, contentWidth, rowHeight, 'F');
        }

        // Row border
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.rect(margin, rowY, contentWidth, rowHeight);

        // Cell borders
        doc.line(colName.x, rowY, colName.x, rowY + rowHeight);
        doc.line(colRole.x, rowY, colRole.x, rowY + rowHeight);
        doc.line(colCompany.x, rowY, colCompany.x, rowY + rowHeight);
        doc.line(colSignature.x, rowY, colSignature.x, rowY + rowHeight);
        doc.line(colTime.x, rowY, colTime.x, rowY + rowHeight);

        // Data
        doc.setFontSize(7);
        doc.text(String(i + 1), colNum.x + 3, textY);
        doc.text((p.nome_completo || '').substring(0, 30), colName.x + 2, textY);
        doc.text((p.funcao || '—').substring(0, 18), colRole.x + 2, textY);
        doc.text((p.empresa || '—').substring(0, 18), colCompany.x + 2, textY);

        // Time
        const signedTime = new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        doc.text(signedTime, colTime.x + 2, textY);

        // Render real signature image
        if (p.assinatura_url) {
            try {
                const sigRes = await fetch(p.assinatura_url);
                const sigBlob = await sigRes.blob();
                const sigBase64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(sigBlob);
                });
                doc.addImage(sigBase64, 'PNG', colSignature.x + 2, rowY + 2, 46, rowHeight - 4);
            } catch {
                doc.setFontSize(6);
                doc.setTextColor(150, 150, 150);
                doc.text('(erro ao carregar)', colSignature.x + 4, textY);
                doc.setTextColor(51, 51, 51);
            }
        }

        y += rowHeight;
    }

    // ===== FOOTER =====
    y += 10;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Total de participantes: ${participantes.length}`, margin, y);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
    doc.text('Documento gerado automaticamente pelo Portal ABZ Group — AN-QUA-001', pageWidth / 2, y, { align: 'center' });

    return doc;
}
