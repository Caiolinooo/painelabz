const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'docs', 'E-social', 'manualorientacaodesenvolvedoresocialv1-15 (1).pdf');
const dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    const text = data.text;
    const term = '7.9.7Respeitar a ordem de precedência no envio dos eventos em lotes';
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index !== -1) {
        console.log("Found section!");
        console.log(text.substring(index, index + 3000).replace(/\s+/g, ' '));
    } else {
        // Try loose search
        const idx2 = text.indexOf('7.9.7');
        if (idx2 !== -1) {
            console.log("Found 7.9.7 loose:");
            console.log(text.substring(idx2, idx2 + 1000).replace(/\s+/g, ' '));
        } else {
            console.log("Not found");
        }
    }
}).catch(err => {
    console.error(err);
});
