const axios = require('axios');
const fs = require('fs');

async function analyze() {
    try {
        console.log('📥 Baixando insomnia.json...');
        const { data } = await axios.get('https://mio.app.br/api/doc/insomnia.json');

        console.log('✅ Arquivo baixado. Analisando...');

        // Extrair Environment Base URL
        const environments = data.resources.filter(r => r._type === 'environment');
        console.log('\n🌍 Ambientes Encontrados:');
        environments.forEach(env => {
            console.log(`   - ${env.name}:`, JSON.stringify(env.data));
        });

        // Extrair Requests e URLs
        const requests = data.resources.filter(r => r._type === 'request');
        console.log(`\n📡 Total de Requests: ${requests.length}`);

        const uniqueUrls = new Set();
        requests.forEach(req => {
            uniqueUrls.add(req.url);
        });

        console.log('\n🔗 Padrões de URL encontrados:');
        uniqueUrls.forEach(url => console.log(`   - ${url}`));

    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

analyze();
