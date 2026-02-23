require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

function sanitize(str) {
    if (str === null || str === undefined) return null;
    return String(str).replace(/[\r\n\t]+/g, ' ').trim();
}

async function importSuppliers(filePath) {
    const logStream = fs.createWriteStream('scripts/import-log.txt', { flags: 'w' });
    const log = (msg) => {
        logStream.write(msg + '\n');
        console.log(msg); // terminal will also get it, but we can rely on logStream if it gets corrupted
    };

    log(`Reading Excel file: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    let totalImported = 0;
    let totalErrors = 0;

    for (const sheetName of workbook.SheetNames) {
        log(`\n--- Processing Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

        if (data.length < 2) {
            log('Skipping empty or invalid sheet.');
            continue;
        }

        const isPJ = sheetName.includes('PJ');

        // Find header row (usually index 1, where 'Cód. Forn.' exists)
        const headerRowIndex = data.findIndex(row => row && row.includes('Cód. Forn.'));
        if (headerRowIndex === -1) {
            log('Could not find header row. Skipping.');
            continue;
        }

        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];

            // Skip empty rows
            if (!row || row.length === 0 || !row[1]) continue;

            try {
                let sequential_id, legal_name, trade_name, document_number, city, contact_phone, statusText;

                if (isPJ) {
                    // Indices for PJ:
                    // 1: Cód. Forn., 2: Nome Fornecedor, 3: Nome fantasia, 4: Escopo, 5: Telefone, 6: Município, 7: CNPJ/CPF, 8: Pessoa, 9: Status
                    sequential_id = row[1];
                    legal_name = row[2];
                    trade_name = row[3] || legal_name; // Fallback to legal name if no trade name
                    contact_phone = row[5];
                    city = row[6];
                    document_number = row[7];
                    statusText = row[9];
                } else {
                    // Indices for PF:
                    // 1: Cód. Forn., 2: Nome Fornecedor, 3: ESCOPO, 4: Município, 5: Telefone, 6: CNPJ/CPF, 7: Pessoa, 8: Status
                    sequential_id = row[1];
                    legal_name = row[2];
                    trade_name = legal_name; // PF uses same name
                    city = row[4];
                    contact_phone = row[5];
                    document_number = row[6];
                    statusText = row[8];
                }

                trade_name = sanitize(trade_name);
                legal_name = sanitize(legal_name) || trade_name;
                document_number = sanitize(document_number);
                sequential_id = sanitize(sequential_id);
                contact_phone = sanitize(contact_phone);
                city = sanitize(city);

                if (!trade_name) {
                    log(`Row ${i} missing name, skipping.`);
                    continue;
                }

                const status = (statusText && String(statusText).toLowerCase().includes('inativo')) ? 'inactive' : 'active';

                const supplierData = {
                    sequential_id,
                    trade_name,
                    legal_name,
                    document_number,
                    contact_phone,
                    city,
                    status
                };

                // Upsert into Supabase (match by document_number if exists, otherwise try sequential_id or name?)
                // Actually, sequential_id might be the best unique identifier here coming from legacy.
                // Let's just insert for now, if it errors because of unique constraint on sequential_id, we update.
                const { error } = await supabaseAdmin
                    .from('suppliers')
                    .upsert(supplierData, {
                        onConflict: 'sequential_id',
                        ignoreDuplicates: false
                    });

                if (error) {
                    log(`Error importing row ${i} (${trade_name}): ${error.message || JSON.stringify(error)}`);
                    totalErrors++;
                } else {
                    totalImported++;
                    if (totalImported % 50 === 0) {
                        log(`Imported ${totalImported} suppliers...`);
                    }
                }

            } catch (err) {
                log(`Unexpected error on row ${i}: ${err.message}`);
                totalErrors++;
            }
        }
    }

    log(`\n--- Import Complete ---`);
    log(`Successfully imported/updated: ${totalImported}`);
    log(`Errors: ${totalErrors}`);
    logStream.end();
}

const fileArg = process.argv[2];
if (!fileArg) {
    console.error('Please provide the path to the Excel file.');
    console.error('Usage: node scripts/import-suppliers-xlsx.js <path-to-file>');
    process.exit(1);
}

importSuppliers(fileArg);
