const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials in env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: sectors, error: err1 } = await supabase.from('sectors').select('*');
    console.log("Sectors count:", sectors?.length, err1?.message || '');
    if (sectors?.length) console.log("Sample sector:", sectors[0]);

    const { data: users, error: err2 } = await supabase.from('users_unified').select('id, sector_id, department, name').limit(5);
    console.log("Users sample:", users, err2?.message || '');
}

check();
