/**
 * EPI Stock Import/Export Service
 * Handles importing stock from the AN-CPR-003 Excel spreadsheet format
 * and exporting current stock data in the same format.
 */

import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/db';

// ==================== TYPES ====================

export interface StockSpreadsheetRow {
    tipo: string;          // Category (Geral, Hotelaria, EPI)
    descricao: string;     // Item description
    ca: string;            // CA number or "-"
    validade_ca: string;   // CA validity date or "-"
    unidade: string;       // Unit (unid., Pacote, Pacote/100)
    saldo_atual: number;   // Current stock quantity
}

export interface ImportResult {
    total_rows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
    details: { row: number; item: string; action: string }[];
}

// ==================== PARSE SPREADSHEET ====================

/**
 * Parse the AN-CPR-003 stock control spreadsheet.
 * The spreadsheet has a header section (rows 1-9) and data starting from row 10.
 * Columns: B=Tipo, C=Descrição do Item, D=CA, E=Validade CA, F=Unidade, G=Saldo atual
 */
export function parseStockSpreadsheet(buffer: ArrayBuffer): StockSpreadsheetRow[] {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) throw new Error('Planilha vazia ou formato inválido');

    // Convert to array of arrays to handle the header offset
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const rows: StockSpreadsheetRow[] = [];

    // Find the header row by looking for "Tipo" and "Descrição"
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        if (!row) continue;
        const rowStr = row.map((c: any) => String(c || '').toLowerCase().trim());
        if (rowStr.some(c => c.includes('tipo')) && rowStr.some(c => c.includes('descri'))) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        throw new Error('Cabeçalho da planilha não encontrado. Esperado colunas: Tipo, Descrição do Item, CA, Validade CA, Unidade, Saldo atual');
    }

    // Find column indices from header
    const headerRow = rawData[headerRowIndex].map((c: any) => String(c || '').toLowerCase().trim());

    const colTipo = headerRow.findIndex((c: string) => c.includes('tipo'));
    const colDesc = headerRow.findIndex((c: string) => c.includes('descri'));
    const colCA = headerRow.findIndex((c: string) => c === 'ca');
    const colValidade = headerRow.findIndex((c: string) => c.includes('validade'));
    const colUnidade = headerRow.findIndex((c: string) => c.includes('unid'));
    const colSaldo = headerRow.findIndex((c: string) => c.includes('saldo'));

    // Parse data rows (everything after header)
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row) continue;

        const descricao = String(row[colDesc] || '').trim();
        if (!descricao) continue; // Skip empty rows

        const tipo = String(row[colTipo] || '').trim();
        if (!tipo) continue;

        let ca = '';
        if (colCA >= 0) {
            const rawCA = row[colCA];
            ca = rawCA ? String(rawCA).trim() : '';
            if (ca === '-' || ca === '0') ca = '';
        }

        let validadeCA = '';
        if (colValidade >= 0) {
            const rawVal = row[colValidade];
            if (rawVal instanceof Date) {
                validadeCA = rawVal.toISOString().split('T')[0];
            } else if (rawVal && String(rawVal).trim() !== '-' && String(rawVal).trim() !== '') {
                // Try to parse date string (DD/MM/YYYY format)
                const dateStr = String(rawVal).trim();
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    validadeCA = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                } else {
                    validadeCA = dateStr;
                }
            }
        }

        let unidade = 'unid.';
        if (colUnidade >= 0) {
            const rawUnit = String(row[colUnidade] || '').trim().toLowerCase();
            if (rawUnit.includes('pacote/100')) unidade = 'Pacote/100';
            else if (rawUnit.includes('pacote')) unidade = 'Pacote';
            else unidade = 'unid.';
        }

        let saldo = 0;
        if (colSaldo >= 0) {
            const rawSaldo = row[colSaldo];
            saldo = typeof rawSaldo === 'number' ? rawSaldo : parseInt(String(rawSaldo || '0'), 10) || 0;
        }

        rows.push({ tipo, descricao, ca, validade_ca: validadeCA, unidade, saldo_atual: saldo });
    }

    return rows;
}

// ==================== IMPORT ====================

/**
 * Import parsed spreadsheet data into the database.
 * Creates or updates epi_types and epi_stock records.
 */
export async function importStockFromSpreadsheet(
    rows: StockSpreadsheetRow[],
    performedBy: string
): Promise<ImportResult> {
    const result: ImportResult = {
        total_rows: rows.length,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        details: [],
    };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
            // 1. Find or create EPI type
            let epiType = await findEpiTypeByName(row.descricao);

            if (!epiType) {
                // Create new EPI type
                const { data: newType, error: createError } = await supabaseAdmin
                    .from('epi_types')
                    .insert({
                        name: row.descricao,
                        category: row.tipo,
                        ca_number: row.ca || null,
                        ca_validity_date: row.validade_ca || null,
                        ca_status: row.ca ? (isCAExpired(row.validade_ca) ? 'VENCIDO' : 'VÁLIDO') : null,
                        is_required: false,
                    })
                    .select()
                    .single();

                if (createError) {
                    result.errors.push(`Linha ${i + 1} (${row.descricao}): ${createError.message}`);
                    result.skipped++;
                    continue;
                }
                epiType = newType;
                result.details.push({ row: i + 1, item: row.descricao, action: 'tipo_criado' });
            } else {
                // Update existing type with CA info if provided
                if (row.ca || row.validade_ca) {
                    await supabaseAdmin
                        .from('epi_types')
                        .update({
                            category: row.tipo || epiType.category,
                            ca_number: row.ca || epiType.ca_number,
                            ca_validity_date: row.validade_ca || epiType.ca_validity_date,
                            ca_status: row.ca ? (isCAExpired(row.validade_ca) ? 'VENCIDO' : 'VÁLIDO') : epiType.ca_status,
                        })
                        .eq('id', epiType.id);
                }
            }

            // 2. Upsert stock record
            const { data: existingStock } = await supabaseAdmin
                .from('epi_stock')
                .select('*')
                .eq('epi_type_id', epiType.id)
                .single();

            if (existingStock) {
                const previousQty = existingStock.current_quantity;
                if (previousQty !== row.saldo_atual || existingStock.unit !== row.unidade) {
                    // Update stock
                    await supabaseAdmin
                        .from('epi_stock')
                        .update({
                            current_quantity: row.saldo_atual,
                            unit: row.unidade,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingStock.id);

                    // Record adjustment movement
                    if (previousQty !== row.saldo_atual) {
                        await supabaseAdmin
                            .from('epi_stock_movements')
                            .insert({
                                stock_id: existingStock.id,
                                epi_type_id: epiType.id,
                                movement_type: 'adjustment',
                                quantity: row.saldo_atual,
                                previous_quantity: previousQty,
                                new_quantity: row.saldo_atual,
                                reason: 'Importação de planilha de estoque',
                                performed_by: performedBy,
                            });
                    }

                    result.updated++;
                    result.details.push({ row: i + 1, item: row.descricao, action: `estoque_atualizado: ${previousQty} → ${row.saldo_atual}` });
                } else {
                    result.skipped++;
                    result.details.push({ row: i + 1, item: row.descricao, action: 'sem_alteracao' });
                }
            } else {
                // Create new stock record
                const { data: newStock, error: stockError } = await supabaseAdmin
                    .from('epi_stock')
                    .insert({
                        epi_type_id: epiType.id,
                        current_quantity: row.saldo_atual,
                        minimum_quantity: 5,
                        unit: row.unidade,
                        location: '',
                    })
                    .select()
                    .single();

                if (stockError) {
                    result.errors.push(`Linha ${i + 1} (${row.descricao}): ${stockError.message}`);
                    result.skipped++;
                    continue;
                }

                // Record initial entry movement
                if (row.saldo_atual > 0) {
                    await supabaseAdmin
                        .from('epi_stock_movements')
                        .insert({
                            stock_id: newStock.id,
                            epi_type_id: epiType.id,
                            movement_type: 'entry',
                            quantity: row.saldo_atual,
                            previous_quantity: 0,
                            new_quantity: row.saldo_atual,
                            reason: 'Importação de planilha de estoque (estoque inicial)',
                            performed_by: performedBy,
                        });
                }

                result.created++;
                result.details.push({ row: i + 1, item: row.descricao, action: `estoque_criado: ${row.saldo_atual} ${row.unidade}` });
            }
        } catch (err: any) {
            result.errors.push(`Linha ${i + 1} (${row.descricao}): ${err.message}`);
            result.skipped++;
        }
    }

    return result;
}

// ==================== EXPORT ====================

/**
 * Generate stock report spreadsheet in the AN-CPR-003 format.
 * Returns an XLSX buffer ready to be sent as a download.
 */
export async function generateStockReportXLSX(): Promise<Buffer> {
    // Fetch all stock with type info
    const { data: stocks, error } = await supabaseAdmin
        .from('epi_stock')
        .select(`
            *,
            epi_types!epi_stock_epi_type_id_fkey (
                id, name, category, ca_number, ca_validity_date
            )
        `)
        .order('updated_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar estoque: ${error.message}`);

    // Organize by category
    const grouped: Record<string, any[]> = {};
    for (const stock of stocks || []) {
        const category = (stock as any).epi_types?.category || 'Outros';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(stock);
    }

    // Build worksheet data
    const wsData: any[][] = [];

    // Header rows (matching AN-CPR-003 format)
    wsData.push([]);  // Row 1: empty (logo area)
    wsData.push(['', 'ANEXO / ANNEX', '', '', 'COD.: AN-CPR-003', '', '']);
    wsData.push(['', '', '', '', 'Proc. Ref.: PR-CPR-01', '', 'REV.: 0']);
    wsData.push(['', 'Planilha de Controle de Estoque - EPI / Uniforme', '', '', `Data de emissão: ${formatDateBR(new Date())}`, '', 'PAG.: 1']);
    wsData.push([]);  // Row 5
    wsData.push(['', `Aplicável a / Applicable to: ( x ) Brasil    ( ) International`]);
    wsData.push([]);  // Row 7
    wsData.push(['', `Último inventário:`, formatDateBR(new Date()), '', 'Verificado por:', '', '']);
    wsData.push(['', '', '', '', 'EPI', '', '']);

    // Table header
    wsData.push(['', 'Tipo', 'Descrição do Item', 'CA', 'Validade CA', 'Unidade', 'Saldo atual']);

    // Data rows grouped by category
    const categoryOrder = ['Geral', 'Hotelaria', 'EPI', 'Proteção Craniana', 'Proteção Ocular', 'Proteção Auditiva', 'Proteção Respiratória', 'Proteção das Mãos', 'Proteção dos Pés', 'Proteção Corporal', 'Proteção Visual', 'Queda', 'Outros'];

    const sortedCategories = Object.keys(grouped).sort((a, b) => {
        const idxA = categoryOrder.indexOf(a);
        const idxB = categoryOrder.indexOf(b);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    for (const category of sortedCategories) {
        const items = grouped[category];
        for (const item of items) {
            const epiType = (item as any).epi_types;
            const caDate = epiType?.ca_validity_date
                ? formatDateBR(new Date(epiType.ca_validity_date))
                : '-';

            wsData.push([
                '',
                category,
                epiType?.name || '',
                epiType?.ca_number || '-',
                caDate,
                item.unit || 'unid.',
                item.current_quantity || 0,
            ]);
        }
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 3 },   // A
        { wch: 14 },  // B: Tipo
        { wch: 40 },  // C: Descrição
        { wch: 10 },  // D: CA
        { wch: 14 },  // E: Validade CA
        { wch: 12 },  // F: Unidade
        { wch: 12 },  // G: Saldo atual
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Estoque EPI');

    // Generate buffer
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(xlsxBuffer);
}

// ==================== HELPERS ====================

async function findEpiTypeByName(name: string): Promise<any | null> {
    // Try exact match first
    const { data: exact } = await supabaseAdmin
        .from('epi_types')
        .select('*')
        .ilike('name', name)
        .limit(1)
        .single();

    if (exact) return exact;

    // Try fuzzy match — normalize and search
    const normalized = name.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/tam\.?\s*/i, 'tam. ')
        .trim();

    const { data: allTypes } = await supabaseAdmin
        .from('epi_types')
        .select('*');

    if (!allTypes) return null;

    // Find best match
    for (const type of allTypes) {
        const typeName = type.name.toLowerCase().replace(/\s+/g, ' ').trim();
        if (typeName === normalized) return type;
    }

    return null;
}

function isCAExpired(validityDate: string): boolean {
    if (!validityDate) return false;
    const expiry = new Date(validityDate);
    return !isNaN(expiry.getTime()) && expiry <= new Date();
}

function formatDateBR(date: Date): string {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
