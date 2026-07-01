const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

const target = '"req_b1d9b5315f244c9b9c7776a5fc6daea4"';
let index = 0;
while (true) {
  index = html.indexOf(target, index);
  if (index === -1) break;
  console.log(`\n=== JSON MATCH AT ${index} ===`);
  const snippet = html.substring(index, index + 3000);
  console.log(snippet.substring(0, 1500));
  index += 10;
}
