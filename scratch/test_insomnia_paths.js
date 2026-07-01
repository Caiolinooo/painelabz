const axios = require('axios');

const PATHS = [
  'https://mio.app.br/insomnia.json',
  'https://mio.app.br/api/insomnia.json',
  'https://mio.app.br/api/v1/insomnia.json',
  'https://mio.app.br/api/v1/doc/insomnia.json',
  'https://mio.app.br/doc/insomnia.json',
  'https://mio.app.br/docs/insomnia.json',
  'https://mio.app.br/api/v1/swagger.json',
  'https://mio.app.br/swagger.json',
  'https://mio.app.br/api/swagger.json',
  'https://mio.app.br/api/v1/doc',
  'https://mio.app.br/api/doc',
  'https://mio.app.br/doc'
];

async function run() {
  for (const url of PATHS) {
    try {
      const res = await axios.get(url, { timeout: 3000, validateStatus: () => true });
      console.log(`${url} -> Status: ${res.status} | Content-Type: ${res.headers['content-type']}`);
      if (res.status === 200 && !res.headers['content-type'].includes('html')) {
        console.log(`   SUCCESS! Length: ${JSON.stringify(res.data).length}`);
        if (url.endsWith('.json')) {
          require('fs').writeFileSync('scratch/downloaded_insomnia.json', JSON.stringify(res.data, null, 2));
          console.log('   Saved to scratch/downloaded_insomnia.json');
        }
      }
    } catch (e) {
      console.log(`${url} -> Error: ${e.message}`);
    }
  }
}

run();
