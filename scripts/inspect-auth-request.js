const axios = require('axios');

async function inspect() {
    try {
        const { data } = await axios.get('https://mio.app.br/api/doc/insomnia.json');
        const requests = data.resources.filter(r => r._type === 'request');

        const authReq = requests.find(r => r.url.includes('authenticate'));

        if (authReq) {
            console.log('🔍 Detalhes do Request /authenticate:');
            console.log('Method:', authReq.method);
            console.log('URL:', authReq.url);
            console.log('Body Type:', authReq.body.mimeType);
            console.log('Body Content:', authReq.body.text);
            console.log('Headers:', authReq.headers);
            console.log('Params:', authReq.parameters);
            console.log('Authentication:', authReq.authentication);
        } else {
            console.log('❌ Request /authenticate não encontrado no JSON.');
        }

    } catch (e) {
        console.error(e.message);
    }
}

inspect();
