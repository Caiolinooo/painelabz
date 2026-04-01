async function testLoginDebug() {
    console.log('🧪 Debugging Poliweb login...\n');

    console.log('1️⃣ Getting login page...');
    const loginPage = await fetch('https://poliweb.policlinicamacae.com.br/Identity/Account/Login', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });

    const loginHtml = await loginPage.text();
    const initialCookies = loginPage.headers.getSetCookie?.() || [];
    console.log('✅ Login page loaded (' + loginHtml.length + ' bytes)');
    console.log('   URL: ' + loginPage.url);
    console.log('   Initial cookies: ' + initialCookies.length);
    
    initialCookies.forEach((c, i) => {
        console.log('   Cookie ' + (i+1) + ': ' + c.substring(0, 80) + '...');
    });

    // Find the form action
    const formMatch = loginHtml.match(/<form[^>]*id="account"[^>]*>/);
    if (formMatch) {
        console.log('\n📋 Form: ' + formMatch[0]);
    }

    const csrfMatch = loginHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
    if (!csrfMatch) {
        console.log('\n❌ CSRF token not found!');
        return;
    }
    console.log('\n✅ CSRF token: ' + csrfMatch[1].substring(0, 30) + '...\n');

    console.log('2️⃣ Attempting login...');
    const formBody = new URLSearchParams();
    formBody.append('Input.Email', 'hudna.mendonca@groupabz.com');
    formBody.append('Input.Password', 'Clave#123');
    formBody.append('Input.RememberMe', 'true');
    formBody.append('__RequestVerificationToken', csrfMatch[1]);

    // Try posting to the login page directly
    const loginResponse = await fetch('https://poliweb.policlinicamacae.com.br/Identity/Account/Login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': initialCookies.join('; '),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        body: formBody.toString(),
        redirect: 'manual',
    });

    console.log('   Status: ' + loginResponse.status);
    const location = loginResponse.headers.get('location');
    console.log('   Location: ' + location);
    const sessionCookies = loginResponse.headers.getSetCookie?.() || [];
    console.log('   Session cookies: ' + sessionCookies.length);
    
    sessionCookies.forEach((c, i) => {
        console.log('   Cookie ' + (i+1) + ': ' + c.substring(0, 80) + '...');
    });

    if (loginResponse.status === 302 && location) {
        if (location.includes('Login')) {
            console.log('\n❌ Login FAILED - redirected to login page');
            console.log('   This usually means:');
            console.log('   - Email/senha incorretos');
            console.log('   - Conta bloqueada');
            console.log('   - Usuário não existe no Poliweb');
        } else {
            console.log('\n✅ Login SUCCESS - redirected to: ' + location);
        }
    } else if (loginResponse.status === 200) {
        const body = await loginResponse.text();
        if (body.includes('Input_Password')) {
            console.log('\n❌ Login FAILED - still on login page');
            // Look for validation messages
            const validationMatch = body.match(/class="text-danger[^"]*"[^>]*>([^<]+)</g);
            if (validationMatch) {
                console.log('   Validation errors found:');
                validationMatch.forEach(v => console.log('   - ' + v));
            }
        } else {
            console.log('\n✅ Login SUCCESS (status 200)');
        }
    }
}

testLoginDebug().catch(console.error);
