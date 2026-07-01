const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const eventId = '75c7ee81-210a-417d-ad3c-12e1b126b660';
  
  const { data: event, error: eventError } = await supabase
    .from('esocial_eventos')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventError) {
    console.error("Error fetching event:", eventError);
    return;
  }

  console.log("=== EVENT DATA ===");
  console.log("evento_codigo:", event.evento_codigo);
  console.log("cpf_trabalhador:", event.cpf_trabalhador);
  console.log("cnpj_empregador:", event.cnpj_empregador);
  console.log("matricula:", event.matricula);

  if (event.dados_evento && event.dados_evento.colaborador_id) {
    const colabId = event.dados_evento.colaborador_id;
    console.log(`\n=== COLLABORATOR ${colabId} ===`);
    const { data: colab, error: colabError } = await supabase
      .from('gt_colaboradores')
      .select('*, gt_empresas(*)')
      .eq('id', colabId)
      .maybeSingle();

    if (colabError) {
      console.error("Error fetching collaborator:", colabError);
    } else if (colab) {
      console.log("Nome:", colab.nome_completo);
      console.log("CPF:", colab.cpf_numero);
      console.log("Matricula:", colab.matricula);
      if (colab.gt_empresas) {
        console.log("\n=== COMPANY ===");
        console.log("ID:", colab.gt_empresas.id);
        console.log("Nome Fantasia:", colab.gt_empresas.nome_fantasia);
        console.log("Razão Social:", colab.gt_empresas.razao_social);
        console.log("CNPJ:", colab.gt_empresas.cnpj);
      } else {
        console.log("No linked company found on collaborator");
      }
    } else {
      console.log("Collaborator not found");
    }
  }
}

run();
