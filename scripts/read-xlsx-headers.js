const xlsx = require('xlsx');

function readHeaders(filePath) {
    const workbook = xlsx.readFile(filePath);

    console.log('Sheet Names:', JSON.stringify(workbook.SheetNames));

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        console.log(`Total Rows: ${data.length}`);
        if (data.length > 0) {
            // Find the first few rows that actually have data
            let printed = 0;
            for (let i = 0; i < Math.min(data.length, 20); i++) {
                const row = data[i];
                if (row && row.length > 0 && row.some(cell => cell)) {
                    console.log(`Row ${i}:`, JSON.stringify(row));
                    printed++;
                    if (printed >= 5) break;
                }
            }
        }
    }
}

readHeaders(process.argv[2]);
