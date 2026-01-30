
// Mock Browser Environment
global.window = {} as any;
global.navigator = { userAgent: 'node' } as any;
global.document = {} as any;

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { loginWithPassword, findUserByQuery } from '@/lib/auth';

async function testUserLogin() {
    console.log('Testing User Login Logic...');

    // 1. Try to find the user from the screenshot
    const email = 'ludmilla.oliveira@groupabz.com';
    console.log(`Looking for user: ${email}`);

    try {
        const user = await findUserByQuery({ email });

        if (!user) {
            console.error('User not found in database.');
            return;
        }

        console.log('User found:', { id: user.id, email: user.email, hasPassword: !!user.password_hash });

        console.log('Attempting login with dummy password...');
        const result = await loginWithPassword(email, 'wrongpassword123');

        console.log('Login Result:', result);

        if (!result.success && result.message === 'Senha incorreta') {
            console.log('SUCCESS: Login logic verified (rejected wrong password correctly).');
        } else {
            console.log('Observation: Login returned unexpected result:', result.message);
        }
    } catch (e) {
        console.error('Test Execution Error:', e);
    }
}

testUserLogin();
