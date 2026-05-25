const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'docs', 'E-social', 'manualorientacaodesenvolvedoresocialv1-15 (1).pdf');
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    const text = data.text;
    console.log("PDF Pages:", data.numpages);
    
    const terms = ['130', '1557', 'contrato de trabalho', 'informação cadastral do empregador'];
    terms.forEach(term => {
        let index = 0;
        let count = 0;
        console.log(`\n--- Searching for: "${term}" ---`);
        while ((index = text.toLowerCase().indexOf(term.toLowerCase(), index)) !== -1) {
            count++;
            const start = Math.max(0, index - 150);
            const end = Math.min(text.length, index + term.length + 150);
            console.log(`Match ${count}: ... ${text.substring(start, end).replace(/\s+/g, ' ')} ...`);
            index += term.length;
            if (count >= 5) {
                console.log("Too many matches, truncating...");
                break;
            }
        }
    });
}).catch(err => {
    console.error(err);
});
