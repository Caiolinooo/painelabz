
const fs = require('fs');

const CA_NUMBER = '5745';
const MTE_CONSULTA_URL = 'https://caepi.mte.gov.br/internet/ConsultaCAInternet.aspx';

async function run() {
    console.log('1. GET Initial Page...');
    const getResponse = await fetch(MTE_CONSULTA_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        }
    });

    if (!getResponse.ok) {
        console.error('GET failed:', getResponse.status);
        return;
    }

    const html = await getResponse.text();
    fs.writeFileSync('mte_initial.html', html);
    console.log('Saved initial HTML to mte_initial.html');

    const setCookie = getResponse.headers.get('set-cookie') || '';
    // Fix cookie format: remove attributes, join with semicolon
    // Simple split by comma might break dates, but here cookies don't seem to have dates
    const cookies = setCookie.split(',')
        .map(c => c.split(';')[0].trim()) // Take only name=value
        .join('; ');

    console.log('Clean Cookies:', cookies);

    // Extract viewstate
    const viewState = extractHiddenField(html, '__VIEWSTATE');
    const viewStateGenerator = extractHiddenField(html, '__VIEWSTATEGENERATOR');
    const eventValidation = extractHiddenField(html, '__EVENTVALIDATION');

    console.log('ViewState found:', !!viewState);

    console.log('2. POST Search...');
    const formData = new URLSearchParams();
    formData.set('__VIEWSTATE', viewState);
    if (viewStateGenerator) formData.set('__VIEWSTATEGENERATOR', viewStateGenerator);
    formData.set('__EVENTVALIDATION', eventValidation);
    formData.set('ctl00$PlaceHolderConteudo$cboEquipamento', '*******Selecione*******');
    formData.set('ctl00$PlaceHolderConteudo$txtNumeroCA', CA_NUMBER);
    formData.set('ctl00$PlaceHolderConteudo$btnConsultar', 'Consultar');

    // AJAX PARAMS
    // Use tctl00 prefix found in _initialize
    formData.set('ctl00$ScriptManager1', 'tctl00$PlaceHolderConteudo$panel|ctl00$PlaceHolderConteudo$btnConsultar');
    formData.set('__EVENTTARGET', 'ctl00$PlaceHolderConteudo$btnConsultar');
    formData.set('__EVENTARGUMENT', '');

    const postResponse = await fetch(MTE_CONSULTA_URL, {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Referer': MTE_CONSULTA_URL,
            'Origin': 'https://caepi.mte.gov.br',
            'Cookie': cookies,
            'X-MicrosoftAjax': 'Delta=true',
            'Cache-Control': 'no-cache',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors', // or 'navigate' for full post
            'Sec-Fetch-Dest': 'empty', // 'document' for full post
            'Upgrade-Insecure-Requests': '1'
        },
        body: formData.toString()
    });

    console.log('POST Status:', postResponse.status);
    const resultText = await postResponse.text();

    console.log('Response Length:', resultText.length);
    fs.writeFileSync('mte_debug_response.txt', resultText);
    console.log('Saved response to mte_debug_response.txt');

    // TEST PARSING
    testParsing(resultText);
}

function extractHiddenField(html, fieldName) {
    const patterns = [
        new RegExp(`name="${fieldName}"[^>]*value="([^"]*)"`, 'i'),
        new RegExp(`id="${fieldName}"[^>]*value="([^"]*)"`, 'i'),
        new RegExp(`value="([^"]*)"[^>]*name="${fieldName}"`, 'i'),
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) return match[1];
    }
    return null;
}

function testParsing(html) {
    const extractById = (idPattern) => {
        const patterns = [
            new RegExp(`id=".*${idPattern}"[^>]*>([^<]+)<`, 'i'),
            new RegExp(`id=".*${idPattern}"[^>]*>\\s*([^<]+)\\s*<`, 'i'),
        ];
        for (const p of patterns) {
            const match = html.match(p);
            if (match?.[1]) {
                console.log(`Found ${idPattern}: ${match[1].trim()}`);
                return match[1].trim();
            }
        }
        console.log(`Failed to find ${idPattern}`);
        return '';
    };

    extractById('lblSituacao');
    extractById('lblValidade');
    extractById('lblDataValidade');
}

run().catch(console.error);
