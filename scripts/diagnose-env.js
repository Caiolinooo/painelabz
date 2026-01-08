const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

try {
    const envContent = ***REMOVED*** 'utf8');
    const lines = envContent.split('\n');
    let mioUser = '';
    let mioPass = '';

    lines.forEach(line => {
        if (line.trim().startsWith('MIO_AUTH_USER=')) {
            mioUser = line.trim().split('=')[1] || '';
            // Remove quotes if present
            mioUser = mioUser.replace(/^["']|["']$/g, '').trim();
        }
        if (line.trim().startsWith('MIO_AUTH_PASSWORD=')) {
            mioPass = line.trim().split('=')[1] || '';
            mioPass = mioPass.replace(/^["']|["']$/g, '').trim();
        }
    });

    console.log('--- Diagnóstico de Variáveis de Ambiente ---');
    console.log(`MIO_AUTH_USER Length: ${mioUser.length}`);
    console.log(`MIO_AUTH_USER Starts with 'http'? ${mioUser.startsWith('http')}`);
    console.log(`MIO_AUTH_USER Value (First 5 chars): ${mioUser.substring(0, 5)}...`);

    if (mioUser.length === 25 && mioUser.includes('mio.app')) {
        console.log('\n[ALERTA] Parece que você colocou a URL no campo de USUÁRIO!');
        console.log('Verifique se MIO_AUTH_USER no .env.local não está com o valor da URL.');
    }

    if (mioUser === 'apiabz') {
        console.log('\n[OK] Usuário corrigido: "apiabz".');
    } else {
        console.log(`\n[INFO] Usuário atual: "${mioUser}" (Esperado: apiabz)`);
    }

    if (mioPass === 'Abz@2025') {
        console.log('[OK] Senha correta.');
    } else {
        console.log(`[ALERTA] Senha atual tem tamanho ${mioPass.length} (Esperado: 8 - 'Abz@2025'). Valor atual começa com: ${mioPass.substring(0, 3)}...`);
    }

} catch (e) {
    console.error('Erro ao ler .env.local:', e.message);
}
