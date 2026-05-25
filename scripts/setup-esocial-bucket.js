const { createClient } = require('@supabase/supabase-js');

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
  console.log('Configurando bucket esocial-certificados...');

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Erro ao listar buckets:', listError);
    process.exit(1);
  }

  const exists = buckets?.some(b => b.name === 'esocial-certificados');
  if (exists) {
    console.log('Bucket esocial-certificados já existe');
  } else {
    const { error: createError } = await supabase.storage.createBucket('esocial-certificados', {
      public: false,
      fileSizeLimit: 5242880,
    });
    if (createError) {
      console.error('Erro ao criar bucket:', createError);
      process.exit(1);
    }
    console.log('Bucket esocial-certificados criado com sucesso');
  }

  const { error: policyError } = await supabase.rpc('create_storage_policy', {
    bucket_name: 'esocial-certificados',
    policy_name: 'esocial_certificados_admin_all',
    definition: `(auth.role() = 'authenticated')`,
    action: 'ALL',
  }).maybeSingle();

  if (policyError && !policyError.message?.includes('already exists')) {
    console.log('Nota: Não foi possível criar política de storage via RPC (pode ser criada manualmente no dashboard)');
  }

  console.log('Setup concluído');
}

setup().catch(console.error);
