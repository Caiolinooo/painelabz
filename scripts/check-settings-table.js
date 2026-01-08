
const { supabaseAdmin } = require('./src/lib/supabase');

async function check() {
    try {
        const { data, error } = await supabaseAdmin.from('settings').select('*').eq('key', 'company_calendar');
        console.log('Data:', JSON.stringify(data, null, 2));
        console.log('Error:', error);

        // Check table structure
        const { data: cols, error: colError } = await supabaseAdmin.rpc('get_table_columns', { table_name: 'settings' });
        if (colError) {
            console.log('Column check error:', colError);
            // Fallback: try to select a row and see keys
            const { data: sample } = await supabaseAdmin.from('settings').select('*').limit(1);
            if (sample && sample[0]) {
                console.log('Sample row keys:', Object.keys(sample[0]));
            }
        } else {
            console.log('Columns:', cols);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
