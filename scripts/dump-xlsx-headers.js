const xlsx = require('xlsx');
const fs = require('fs');

function dumpHeaders(filePath) {
    const workbook = xlsx.readFile(filePath);
    const result = {};

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        // Use true header mapping to just get array of arrays
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });

        result[sheetName] = [];
        if (data.length > 0) {
            let printed = 0;
            for (let i = 0; i < Math.min(data.length, 20); i++) {
                const row = data[i];
                if (row && row.length > 0 && row.some(cell => cell)) {
                    result[sheetName].push(row);
                    printed++;
                    if (printed >= 5) break;
                }
            }
        }
    }

    fs.writeFileSync('scripts/xlsx-dump.json', JSON.stringify(result, null, 2));
    console.log('Dumped to scripts/xlsx-dump.json');
}

dumpHeaders(process.argv[2]);
