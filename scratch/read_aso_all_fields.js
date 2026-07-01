const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

const index = 855256;
const snippet = html.substring(index, index + 3500);

console.log(snippet.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
