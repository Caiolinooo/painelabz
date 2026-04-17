const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase Client (using Service Role for full access)
const supabase = createClient(
    ***REMOVED***,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***
);

async function importExcel() {
    try {
        const filePath = 'f:\\\\Code\\\\0_Painel ABZ-BR-INT\\\\painel-abz\\\\docs\\\\ManSchedule\\\\Deep Star - Rota.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Parse raw JSON
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        // The first row is just string 'Information Update'
        // The second row is the actual header
        const headers = rawData[1];
        const dataRows = rawData.slice(2);

        const formattedData = [];

        function parseDate(excelDate) {
            if (!excelDate) return null;
            if (typeof excelDate === 'number') {
                const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
                return date.toISOString();
            }
            if (typeof excelDate === 'string') {
                const date = new Date(excelDate);
                if (!isNaN(date.getTime())) return date.toISOString();
            }
            return null;
        }

        for (let row of dataRows) {
            if (!row[1]) continue; // full name is required

            formattedData.push({
                vessel: row[0] ? String(row[0]) : null,
                full_name: String(row[1]),
                position: row[2] ? String(row[2]) : null,
                original_start_date: parseDate(row[3]),
                date_of_birth: parseDate(row[4]),
                status: row[5] ? String(row[5]) : null,
                next_crew_change_date: parseDate(row[6]),
                email: row[7] ? String(row[7]) : null,
                phone: row[8] ? String(row[8]) : null,
                wish_to_transfer: row[9] ? String(row[9]) : null,
                est_transfer_date: row[10] ? String(row[10]) : null,
                rotation_details: row[11] ? String(row[11]) : null,
                location: row[12] ? String(row[12]) : null,
                rates: row[13] ? String(row[13]) : null,
                osm_thome_status: row[14] ? String(row[14]) : null,
                remarks: row[15] ? String(row[15]) : null,
            });
        }
        
        console.log(`Prepared ${formattedData.length} rows for insert.`);

        // Clear existing data (optional, or just insert)
        await supabase.from('man_schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert chunks of 50
        for (let i = 0; i < formattedData.length; i += 50) {
            const chunk = formattedData.slice(i, i + 50);
            const { error } = await supabase.from('man_schedules').insert(chunk);
            if (error) {
                console.error('Insert error:', error.message);
                throw error;
            }
        }

        console.log('Import successful!');
    } catch (e) {
        console.error('Import failed:', e);
    }
}

importExcel();
