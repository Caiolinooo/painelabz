const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

// Find all API endpoints mentioned in the html doc (usually starting with /api/ or similar, or /sms-)
const regex = /\/api\/[a-zA-Z0-9_\-\/]+/g;
const matches = [...html.matchAll(/\/sms-[a-zA-Z0-9_\-\/]+/g)];
console.log('Found /sms- endpoints:');
const uniqueMatches = Array.from(new Set(matches.map(m => m[0])));
uniqueMatches.forEach(m => console.log(m));

console.log('\nSearch for ASO or Saúde or Exame in endpoints or text:');
let pos = 0;
while (true) {
  pos = html.toLowerCase().indexOf('aso', pos);
  if (pos === -1) break;
  console.log(`\nASO Match at ${pos}:`);
  console.log(html.substring(Math.max(0, pos - 100), Math.min(html.length, pos + 300)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  pos += 3;
  if (pos > 100000) {
    console.log('Truncating search...');
    break;
  }
}
