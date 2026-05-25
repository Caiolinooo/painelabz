require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = ***REMOVED***;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = ***REMOVED*** supabaseKey, {
  auth: { persistSession: false },
});

async function run() {
  console.log('Executando migration: add_cadastro_fields_to_colaboradores...');

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260522_000001_add_cadastro_fields_to_colaboradores.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Try RPC first
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.log('RPC exec_sql falhou:', error.message);
    console.log('Tentando execução direta via REST...');

    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    let successCount = 0;
    let failCount = 0;

    for (const stmt of statements) {
      const { error: e } = await supabase.from('_sql_migration').insert({ sql: stmt }).select().maybeSingle();
      if (e && !e.message?.includes('does not exist')) {
        console.log('  Falha (tentando raw):', stmt.substring(0, 80));
        failCount++;
      } else {
        successCount++;
      }
    }

    // Fallback: execute via raw SQL API
    const { error: rawError } = await supabase.rpc('exec_sql_raw', { sql_query: sql });
    if (rawError) {
      console.log('  raw SQL:', rawError.message);

      // Last resort: use the rest API
      for (const stmt of statements) {
        try {
          const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: ***REMOVED*** sql_query: stmt + ';' }),
          });
          if (res.ok) successCount++;
          else {
            const txt = await res.text();
            console.log('  REST falhou:', txt.substring(0, 100));
            failCount++;
          }
        } catch (err) {
          console.log('  Erro:', err.message);
          failCount++;
        }
      }

      console.log(`\nResultado: ${successCount} OK, ${failCount} falhas`);
      if (failCount > 0) {
        console.log('\n⚠️ Algumas colunas podem não ter sido criadas.');
        console.log('Execute manualmente no Supabase SQL Editor:');
        console.log(sql);
      }
    }
  } else {
    console.log('Migration executada com sucesso via exec_sql!');
  }

  console.log('\nVerifique as colunas executando: npm run db:check');
}

run().catch(e => console.error(e));
