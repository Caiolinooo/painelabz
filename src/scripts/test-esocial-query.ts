import { supabaseAdmin } from '../lib/supabase';

async function testQuery() {
  console.log('Testing query on esocial_eventos with esocial_eventos_catalogo join...');
  try {
    const { data, error } = await supabaseAdmin
      .from('esocial_eventos')
      .select('*, esocial_eventos_catalogo!evento_codigo(nome)', { count: 'exact' })
      .limit(5);

    if (error) {
      console.error('❌ Query failed with error:', error);
    } else {
      console.log('✅ Query succeeded!');
      console.log('Returned data count:', data?.length);
      console.log('Sample data:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testQuery();
