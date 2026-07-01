const fs = require('fs');

const html = fs.readFileSync('scratch/mio_api_doc.html', 'utf8');

const id = 'req_b1d9b5315f244c9b9c7776a5fc6daea4';
const index = html.indexOf(id);

if (index !== -1) {
  console.log('Found request object definition!');
  const snippet = html.substring(index, index + 3000);
  console.log(snippet.substring(0, 2000));
} else {
  console.log('Request not found');
}
