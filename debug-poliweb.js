async function debugPoliwebLogin() {
    console.log('🔍 Debugging Poliweb Antigo login page...\n');

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
    
    console.log('📄 Login page status:', loginPage.status);
    console.log('🍪 Session cookie:', sessionCookie?.split(';')[0] || 'None');
    console.log('📏 HTML length:', loginHtml.length);
    
    // Save HTML to file for inspection
    const fs = require('fs');
    fs.writeFileSync('login-page.html', loginHtml);
    console.log('💾 Saved login page to login-page.html\n');

    // Look for all input fields
    console.log('🔍 Searching for input fields...');
    const inputRegex = /<input[^>]*>/gi;
    const inputs = loginHtml.match(inputRegex) || [];
    
    console.log(`📋 Found ${inputs.length} input fields:`);
    inputs.forEach((input, index) => {
        const nameMatch = input.match(/name="([^"]+)"/i);
        const idMatch = input.match(/id="([^"]+)"/i);
        const typeMatch = input.match(/type="([^"]+)"/i);
        const valueMatch = input.match(/value="([^"]*)"/i);
        
        const name = nameMatch ? nameMatch[1] : 'NO NAME';
        const id = idMatch ? idMatch[1] : 'NO ID';
        const type = typeMatch ? typeMatch[1] : 'text';
        const value = valueMatch ? valueMatch[1] : '';
        
        console.log(`  ${index+1}. name="${name}" id="${id}" type="${type}" value="${value.substring(0, 20)}${value.length > 20 ? '...' : ''}"`);
    });

    // Look for ViewState and EventValidation specifically
    console.log('\n🎯 Looking for ViewState and EventValidation...');
    const viewStatePatterns = [
        /id="__VIEWSTATE"\s+value="([^"]+)"/i,
        /__VIEWSTATE"[^>]*value="([^"]+)"/i,
        /name="__VIEWSTATE"[^>]*value="([^"]+)"/i
    ];
    
    const eventValidationPatterns = [
        /id="__EVENTVALIDATION"\s+value="([^"]+)"/i,
        /__EVENTVALIDATION"[^>]*value="([^"]+)"/i,
        /name="__EVENTVALIDATION"[^>]*value="([^"]+)"/i
    ];

    let viewStateValue = null;
    let eventValidationValue = null;
    
    for (const pattern of viewStatePatterns) {
        const match = loginHtml.match(pattern);
        if (match) {
            viewStateValue = match[1];
            console.log(`✅ ViewState found with pattern: ${pattern}`);
            break;
        }
    }
    
    for (const pattern of eventValidationPatterns) {
        const match = loginHtml.match(pattern);
        if (match) {
            eventValidationValue = match[1];
            console.log(`✅ EventValidation found with pattern: ${pattern}`);
            break;
        }
    }
    
    if (!viewStateValue) console.log('❌ ViewState NOT found with any pattern');
    if (!eventValidationValue) console.log('❌ EventValidation NOT found with any pattern');
    
    // Look for common error indicators
    console.log('\n🚨 Looking for error indicators...');
    const errorPatterns = [
        /class="[^"]*error[^"]*"[^>]*>/gi,
        /class="[^"]*msg[^"]*"[^>]*>/gi,
        /alert[^>]*>/gi,
        /validation-summary/gi,
        /<asp:literal[^>]*>/gi
    ];
    
    errorPatterns.forEach(pattern => {
        const matches = loginHtml.match(pattern);
        if (matches) {
            console.log(`⚠️  Found ${matches.length} matches for pattern: ${pattern}`);
            matches.slice(0, 3).forEach((match, idx) => {
                console.log(`   ${idx+1}. ${match.substring(0, 100)}${match.length > 100 ? '...' : ''}`);
            });
        }
    });
    
    // Check if there's a different form structure
    console.log('\n📝 Looking for form elements...');
    const formMatch = loginHtml.match(/<form[^>]*>/i);
    if (formMatch) {
        console.log('✅ Form found:', formMatch[0]);
        
        // Look for form action
        const actionMatch = formMatch[0].match(/action="([^"]*)"/i);
        console.log('🎯 Form action:', actionMatch ? actionMatch[1] : '(empty - self-post)');
    } else {
        console.log('❌ No form tag found');
    }
    
    // Save cleaned HTML for easier reading
    const cleanedHtml = loginHtml
        .replace(/>\s*</g, '><')  // Remove whitespace between tags
        .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments
    
    fs.writeFileSync('login-page-clean.html', cleanedHtml);
    console.log('\n💾 Saved cleaned HTML to login-page-clean.html');
}

// Execute the function
debugPoliwebLogin().catch(console.error);