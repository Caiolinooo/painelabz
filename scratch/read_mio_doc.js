const axios = require('axios');
const fs = require('fs');

async function run() {
  try {
    const res = await axios.get('https://mio.app.br/api/doc', { timeout: 10000 });
    console.log('Status:', res.status);
    console.log('Length:', res.data.length);
    fs.writeFileSync('scratch/mio_api_doc.html', res.data);
    console.log('Saved to scratch/mio_api_doc.html');

    // Extract urls or endpoints
    const matches = res.data.match(/\/[-a-zA-Z0-9@:%._\+~#=]{1,256}\b/g);
    if (matches) {
      console.log('Found matches:', Array.from(new Set(matches)).filter(m => m.includes('int-') || m.includes('sms-') || m.includes('lgp-') || m.includes('json') || m.includes('yaml')).slice(0, 30));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

run();
