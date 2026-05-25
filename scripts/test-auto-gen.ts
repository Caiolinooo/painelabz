import * as dotenv from 'dotenv';
import path from 'path';

// Load environmental variables from .env.local BEFORE other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { autoGenerateESocialEvents } from '../src/services/eSocialAutoService';
import { supabaseAdmin } from '../src/lib/supabase';

async function main() {
  console.log("=== Testing e-Social Auto Event Generation ===");
  
  // Let's fetch one collaborator from gt_colaboradores
  const { data: colaboradores, error: colabError } = await supabaseAdmin
    .from('gt_colaboradores')
    .select('id, nome_completo, cpf, origem')
    .is('deleted_at', null)
    .limit(5);

  if (colabError) {
    console.error("Error fetching collaborators:", colabError);
    return;
  }

  if (!colaboradores || colaboradores.length === 0) {
    console.log("No collaborators found in database. Let's create a mock collaborator.");
    
    // Fetch a cargo and company
    const { data: cargo } = await supabaseAdmin.from('gt_cargos').select('id, nome').limit(1).maybeSingle();
    const { data: empresa } = await supabaseAdmin.from('gt_empresas').select('id, nome, cnpj').limit(1).maybeSingle();

    if (!cargo || !empresa) {
      console.error("Cannot create mock collaborator: cargo or company missing.");
      return;
    }

    const mockCpf = '12345678909';
    // Let's check if the mock cpf is in MIO by adding it to mio_cache
    const { data: cacheRow } = await supabaseAdmin.from('mio_cache').select('*').eq('tipo', 'integrantes').maybeSingle();
    
    let cacheList: any[] = [];
    if (cacheRow && Array.isArray(cacheRow.data)) {
      cacheList = [...cacheRow.data];
    }
    
    // Add mock active employee to cache list if not already there
    const mockMioIntegrante = {
      id: 'mock-mio-999',
      cpf: mockCpf,
      nome: 'COLABORADOR TESTE AUTOGERACAO',
      situacao: 'Ativo',
    };
    
    if (!cacheList.some((i: any) => i.cpf === mockCpf)) {
      cacheList.push(mockMioIntegrante);
      await supabaseAdmin.from('mio_cache').upsert({
        tipo: 'integrantes',
        data: cacheList,
        updated_at: new Date().toISOString()
      });
      console.log("Mock MIO integration added to mio_cache");
    }

    const { data: newColab, error: insertError } = await supabaseAdmin
      .from('gt_colaboradores')
      .insert({
        nome_completo: 'COLABORADOR TESTE AUTOGERACAO',
        cpf: mockCpf,
        cargo_id: cargo.id,
        empresa_id: empresa.id,
        data_admissao: new Date().toISOString().split('T')[0],
        salario: 5000,
        tipo_salario: 'Mensal',
        tipo_contrato: 'CLT',
        origem: 'manual',
        status_embarque: 'desembarcado',
      })
      .select('*')
      .single();

    if (insertError) {
      console.error("Failed to insert mock collaborator:", insertError);
      return;
    }

    console.log("Mock collaborator created:", newColab.nome_completo);
    
    // Run auto generation
    await autoGenerateESocialEvents(newColab.id);

    // Verify
    await verifyResults(mockCpf);
    
    // Cleanup
    await supabaseAdmin.from('gt_colaboradores').delete().eq('id', newColab.id);
    console.log("Mock collaborator cleaned up.");
  } else {
    console.log("Found collaborators in database:");
    for (const c of colaboradores) {
      console.log(`- ${c.nome_completo} (CPF: ${c.cpf}, Origem: ${c.origem})`);
    }
    
    const candidate = colaboradores[0];
    console.log(`\nRunning test on candidate: ${candidate.nome_completo}`);
    
    // Let's ensure this candidate is marked active in mio_cache for testing
    const { data: cacheRow } = await supabaseAdmin.from('mio_cache').select('*').eq('tipo', 'integrantes').maybeSingle();
    let cacheList: any[] = [];
    if (cacheRow && Array.isArray(cacheRow.data)) {
      cacheList = [...cacheRow.data];
    }
    
    const cleanCpf = candidate.cpf.replace(/\D/g, '');
    if (!cacheList.some((i: any) => (i.cpf || '').replace(/\D/g, '') === cleanCpf)) {
      cacheList.push({
        id: 'mock-mio-test-candidate',
        cpf: cleanCpf,
        nome: candidate.nome_completo,
        situacao: 'Ativo',
      });
      await supabaseAdmin.from('mio_cache').upsert({
        tipo: 'integrantes',
        data: cacheList,
        updated_at: new Date().toISOString()
      });
      console.log(`Ensured candidate ${candidate.nome_completo} is active in mio_cache`);
    }

    // Delete existing test events if any, to trigger fresh generation
    await supabaseAdmin.from('esocial_eventos').delete().eq('cpf_trabalhador', cleanCpf);

    await autoGenerateESocialEvents(candidate.id);

    // Verify
    await verifyResults(cleanCpf);
  }
}

async function verifyResults(cpf: string) {
  console.log(`\n=== Verifying results for CPF: ${cpf} ===`);
  const { data: events, error: eventErr } = await supabaseAdmin
    .from('esocial_eventos')
    .select('*')
    .eq('cpf_trabalhador', cpf);
    
  if (eventErr) {
    console.error("Error fetching generated events:", eventErr);
    return;
  }
  
  console.log(`Found ${events?.length || 0} events in database.`);
  if (events) {
    for (const e of events) {
      console.log(`- Event: ${e.evento_codigo}, Status: ${e.status}, XML Generated: ${e.xml_gerado ? 'YES' : 'NO'}`);
      
      const { data: logs } = await supabaseAdmin
        .from('esocial_envios_log')
        .select('*')
        .eq('evento_id', e.id);
        
      console.log(`  Logs: ${logs?.length || 0}`);
      if (logs) {
        for (const l of logs) {
          console.log(`    - Action: ${l.acao}, Success: ${l.sucesso}, Error: ${l.mensagem_erro || 'None'}`);
        }
      }
    }
  }
}

main().catch(console.error);
