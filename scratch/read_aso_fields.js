const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

const target = '"req_b1d9b5315f244c9b9c7776a5fc6daea4"';
const index = html.indexOf(target);

if (index !== -1) {
  const snippet = html.substring(index, index + 4000);
  console.log(snippet);
} else {
  console.log('Not found');
}
