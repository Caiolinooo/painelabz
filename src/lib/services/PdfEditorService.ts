/**
 * PdfEditorService — PDF manipulation using pdf-lib.
 * 
 * Responsibilities:
 * 1. Embed a signature image at exact coordinates on a specific page
 * 2. Add an audit page at the end of the PDF with signer metadata
 */

import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';

export interface SignatureEmbedOptions {
    pdfBytes: Uint8Array;
    signatureBase64: string;
    page: number;        // 1-indexed
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export interface AuditPageData {
    colaboradorNome: string;
    colaboradorCpf?: string;
    colaboradorEmail?: string;
    telefone?: string;
    dataHora: string;
    ip: string;
    navegador: string;
    hashOriginal: string;
    hashFinal: string;
    documentoTitulo: string;
    assinaturaTipo?: string;
    metodoAssinatura?: string;
}

/**
 * Embed a signature image onto a specific page at exact coordinates.
 * Coordinates are in PDF points (1 pt = 1/72 inch), origin at bottom-left.
 */
export async function embedSignatureOnPdf(opts: SignatureEmbedOptions): Promise<Uint8Array> {
    const { pdfBytes, signatureBase64, page, x, y, width = 150, height = 50 } = opts;

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    const pageIndex = page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
        throw new Error(`Página ${page} não existe no documento (total: ${pages.length})`);
    }

    const targetPage = pages[pageIndex];

    // Parse the base64 signature image
    const sigBytes = base64ToUint8Array(signatureBase64);
    let sigImage;

    // Detect format from base64 header or try PNG first
    if (signatureBase64.includes('image/jpeg') || signatureBase64.includes('image/jpg')) {
        sigImage = await pdfDoc.embedJpg(sigBytes);
    } else {
        sigImage = await pdfDoc.embedPng(sigBytes);
    }

    // pdf-lib uses bottom-left origin. The coordinates from the frontend
    // (react-pdf) are top-left origin, so we need to flip Y.
    const pageHeight = targetPage.getHeight();
    const flippedY = pageHeight - y - height;

    targetPage.drawImage(sigImage, {
        x,
        y: flippedY,
        width,
        height,
    });

    return pdfDoc.save();
}

/**
 * Add a full audit/certificate page at the end of the PDF.
 */
export async function addAuditPage(
    pdfBytes: Uint8Array,
    data: AuditPageData
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Title
    page.drawText('CERTIFICADO DE ASSINATURA ELETRÔNICA', {
        x: margin,
        y,
        size: 16,
        font: boldFont,
        color: rgb(0, 0.4, 1),
    });
    y -= 10;

    // Blue line
    page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 2,
        color: rgb(0, 0.4, 1),
    });
    y -= 30;

    // Info block
    const drawField = (label: string, value: string) => {
        page.drawText(label, {
            x: margin,
            y,
            size: 10,
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2),
        });
        page.drawText(value, {
            x: margin + 160,
            y,
            size: 10,
            font,
            color: rgb(0.3, 0.3, 0.3),
        });
        y -= 20;
    };

    drawField('Documento:', data.documentoTitulo);
    drawField('Assinado por:', data.colaboradorNome);
    if (data.assinaturaTipo) {
        drawField('Tipo:', data.assinaturaTipo);
    }
    if (data.colaboradorCpf) {
        drawField('CPF:', data.colaboradorCpf);
    }
    if (data.colaboradorEmail) {
        drawField('E-mail:', data.colaboradorEmail);
    }
    if (data.telefone) {
        drawField('Telefone:', data.telefone);
    }
    if (data.metodoAssinatura) {
        drawField('Método:', data.metodoAssinatura === 'certificado' ? 'Certificado Digital' : 'Dados Pessoais + Assinatura');
    }
    drawField('Data/Hora:', data.dataHora);
    drawField('Endereço IP:', data.ip);
    drawField('Navegador:', truncate(data.navegador, 80));

    y -= 10;
    page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
    });
    y -= 20;

    // Hashes
    page.drawText('INTEGRIDADE CRIPTOGRÁFICA', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0, 0.4, 1),
    });
    y -= 20;

    drawField('Hash Original (SHA-256):', data.hashOriginal);
    drawField('Hash Final (SHA-256):', data.hashFinal);

    y -= 20;

    // Legal text
    const legalText = [
        'Este documento foi assinado eletronicamente conforme Art. 10 da MP 2.200-2/2001.',
        'A assinatura eletrônica avançada vincula inequivocamente as credenciais de login',
        'do EmployeeHub, o registro de conexão (IP/Log) e a criptografia do arquivo,',
        'formando um pacote auditável com força legal.',
        '',
        'Qualquer alteração no arquivo invalida o hash criptográfico acima,',
        'comprovando que o sistema detecta fraudes ou adulterações.',
    ];

    page.drawText('VALIDADE JURÍDICA', {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.3),
    });
    y -= 18;

    for (const line of legalText) {
        page.drawText(line, {
            x: margin,
            y,
            size: 9,
            font,
            color: rgb(0.4, 0.4, 0.4),
        });
        y -= 14;
    }

    // Footer
    y = margin + 20;
    page.drawText(`Gerado automaticamente pelo Portal ABZ Group — ${new Date().toISOString()}`, {
        x: margin,
        y,
        size: 7,
        font,
        color: rgb(0.6, 0.6, 0.6),
    });

    return pdfDoc.save();
}

// ==================== HELPERS ====================

function base64ToUint8Array(base64: string): Uint8Array {
    // Remove data URI prefix if present
    const raw = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');
    return new Uint8Array(buffer);
}

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
}
