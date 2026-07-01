const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

// Find indices of "/sms-aso"
let index = 0;
while (true) {
  index = html.indexOf('/sms-aso', index);
  if (index === -1) break;
  console.log(`\n=== MATCH AT INDEX ${index} ===`);
  const snippet = html.substring(Math.max(0, index - 200), Math.min(html.length, index + 800));
  // Clean up HTML tags for readability
  console.log(snippet.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  index += 8; // move past this match
}
