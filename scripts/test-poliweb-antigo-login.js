async function testOldPoliwebDetailed() {
    console.log('🧪 Detailed OLD Poliweb login test...\n');

    console.log('1️⃣ Getting login page...');
    const loginPage = await fetch('https://www.policlinicaweb.com.br/Login.aspx', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
    });

    const loginHtml = await loginPage.text();
    const setCookie = loginPage.headers.getSetCookie?.() || [];
    const sessionCookie = setCookie.find(c => c.includes('ASP.NET_SessionId'));
    console.log('✅ Session: ' + sessionCookie?.split(';')[0]);

    // Parse the HTML to find all form inputs
    console.log('\n📋 Parsing form inputs...');
    const inputRegex = /<input[^>]*>/g;
    const inputs = loginHtml.match(inputRegex) || [];
    
    const formData = new URLSearchParams();
    let hasUsername = false;
    let hasPassword = false;
    
    inputs.forEach(input => {
        const nameMatch = input.match(/name="([^"]+)"/);
        const valueMatch = input.match(/value="([^"]*)"/);
        const typeMatch = input.match(/type="([^"]+)"/);
        
        if (nameMatch) {
            const name = nameMatch[1];
            const type = typeMatch ? typeMatch[1] : 'text';
            const value = valueMatch ? valueMatch[1] : '';
            
            // Skip submit buttons for now
            if (type === 'submit') return;
            
            // Use the actual field values
            formData.append(name, value);
            
            if (name.toLowerCase().includes('user') || name.toLowerCase().includes('email')) {
                hasUsername = true;
                console.log('   Username field: ' + name + ' (type=' + type + ')');
            }
            if (name.toLowerCase().includes('pass')) {
                hasPassword = true;
                console.log('   Password field: ' + name + ' (type=' + type + ')');
            }
            if (name.startsWith('__')) {
                console.log('   Hidden field: ' + name);
            }
        }
    });

    console.log('\n2️⃣ Attempting login with parsed fields...');
    
    // Add credentials
    formData.set('username', 'hudna.mendonca@groupabz.com');
    formData.set('password', 'Clave#123');

    console.log('   Form fields:');
    for (const [key, value] of formData) {
        if (value) {
            console.log('     ' + key + ' = ' + value.substring(0, 30) + '...');
        } else {
            console.log('     ' + key + ' = (empty)');
        }
    }

    const loginResponse = await fetch('https://www.policlinicaweb.com.br/Login.aspx', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9',
            'Cookie': sessionCookie || '',
            'Origin': 'https://www.policlinicaweb.com.br',
            'Referer': 'https://www.policlinicaweb.com.br/Login.aspx',
        },
        body: formData.toString(),
        redirect: 'manual',
    });

    console.log('\n   Response:');
    console.log('     Status: ' + loginResponse.status);
    console.log('     Redirect: ' + loginResponse.headers.get('location'));
    
    const respCookies = loginResponse.headers.getSetCookie?.() || [];
    console.log('     New cookies: ' + respCookies.length);

    // Check the response body
    if (loginResponse.status === 200) {
        const body = await loginResponse.text();
        
        // Look for any error message patterns
        const errorPatterns = [
            /class="[^"]*error[^"]*"[^>]*>([^<]+)/gi,
            /class="[^"]*msg[^"]*"[^>]*>([^<]+)/gi,
            /<span[^>]*>([^<]*Usuári[^<]*)<\/span>/gi,
            /<div[^>]*>([^<]*senha[^<]*)<\/div>/gi,
        ];
        
        let foundError = false;
        errorPatterns.forEach(pattern => {
            const matches = body.match(pattern);
            if (matches) {
                console.log('\n❌ Error found: ' + matches[0].replace(/<[^>]+>/g, ' ').trim());
                foundError = true;
            }
        });
        
        if (!foundError) {
            // Check what the page contains now
            if (body.includes('username') && body.includes('password')) {
                console.log('\n⚠️  Still on login page - credentials may be wrong');
            } else {
                console.log('\n✅ Logged in - content changed');
            }
        }
    } else if (loginResponse.status === 302) {
        console.log('\n✅ Redirect response');
    }
}

testOldPoliwebDetailed().catch(console.error);
