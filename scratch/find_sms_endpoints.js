const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

const regex = /\/sms-[-a-zA-Z0-9_]*/g;
const matches = html.match(regex);
const uniqueMatches = Array.from(new Set(matches));

console.log('=== Found SMS Endpoints ===');
console.log(uniqueMatches.sort());
