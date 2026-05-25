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

async function setup() {
  console.log('Executando migration mio_cache...');

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260521_000002_create_mio_cache.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Erro ao executar migration via exec_sql:', error.message);
    console.log('Tentando execução direta via REST...');

    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));
    let successCount = 0;
    let errorCount = 0;

    for (const stmt of statements) {
      const { error: stmtErr } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });
      if (stmtErr) {
        console.error(`Erro no statement: ${stmt.substring(0, 80)}... - ${stmtErr.message}`);
        errorCount++;
      } else {
        successCount++;
      }
    }

    if (errorCount > 0) {
      console.error(`Migration concluída com ${successCount} sucessos e ${errorCount} erros`);
      process.exit(1);
    }

    console.log(`Migration executada: ${successCount} statements`);
  } else {
    console.log('Migration mio_cache executada com sucesso!');
  }
}

setup().catch(console.error);
