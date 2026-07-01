const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

// Find all matches for endpoints containing "aso"
const regex = /"url":"{{ _\.baseURL }}\/([^"]*)"/g;
let match;
const endpoints = [];
while ((match = regex.exec(html)) !== null) {
  const url = match[1];
  if (url.toLowerCase().includes('aso')) {
    endpoints.push(url);
  }
}

console.log('Endpoints containing aso:', Array.from(new Set(endpoints)));
