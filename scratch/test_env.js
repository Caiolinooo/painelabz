const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

console.log("CWD:", process.cwd());
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

console.log(".env.local exists:", fs.existsSync(envLocalPath));
console.log(".env exists:", fs.existsSync(envPath));

const resLocal = dotenv.config({ path: envLocalPath });
console.log("Loaded .env.local keys:", Object.keys(resLocal.parsed || {}));
console.log("NEXT_PUBLIC_SUPABASE_URL in process.env:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
