
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumns() {
    console.log('Checking purchase_orders columns...');
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No data found, implying table exists but is empty. Cannot determine columns easily this way without schema query.');
        // Try inserting a dummy to fail on column? No. 
        // Let's generic query schema if Rpc or straight sql not avail.
        // Actually, listing keys of an empty result won't work.
        // But if I select *, I verified the query worked.
    }
}

checkColumns();
