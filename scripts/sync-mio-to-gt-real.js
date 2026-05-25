const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const BASE = 'https://mio.app.br/api/v1';
const USER = (process.env.MIO_AUTH_USER || '').replace(/["']/g, '').trim();
const PASS = (process.env.MIO_AUTH_PASSWORD || '').replace(/["']/g, '').trim();

if (!USER || !PASS) {
  console.error('MIO credentials not found in env');
  process.exit(1);
}

function cleanDate(dateStr) {
  if (!dateStr) return null;
  const d = dateStr.trim();
  if (d === '0000-00-00' || d === '0000-00-00 00:00:00' || d === '') return null;
  return d;
}

async function sync() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await db.connect();
    console.log('Connected to database.');

    // 1. Fetch from MIO
    console.log('Authenticating with MIO...');
    const creds = Buffer.from(`${USER}:${PASS}`).toString('base64');
    const { data: auth } = await axios.post(`${BASE}/authenticate`, {}, {
      headers: { 'Authorization': `Basic ${creds}` }
    });
    const headers = { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' };

    console.log('Fetching active tripulantes...');
    const { data: rIntegrantes } = await axios.post(`${BASE}/int-integrante-get`, {}, { headers });
    const activeIntegrantes = rIntegrantes.integrante.filter(i => i.situacao !== 'Desligado');
    console.log(`Found ${activeIntegrantes.length} active tripulantes.`);

    console.log('Fetching LGP history...');
    const cnpj = process.env.MIO_CNPJ;
    const { data: rHistory } = await axios.post(`${BASE}/lgp-reports`, { 
      cnpj,
      periodo_inicio: '2026-01-01',
      periodo_fim: '2026-12-31'
    }, { headers, timeout: 20000 });
    
    const lgpList = rHistory.history || [];
    console.log(`Found ${lgpList.length} logistics records.`);

    // 2. Map LGP data by CPF to find current vessel/company and embarkation status
    const lgpByCpf = new Map();
    lgpList.forEach(item => {
      const cpf = item.CPF ? item.CPF.replace(/\D/g, '') : '';
      if (!cpf) return;

      // Keep the latest record based on "Embarque Real"
      const existing = lgpByCpf.get(cpf);
      if (!existing || (item["Embarque Real"] && (!existing["Embarque Real"] || item["Embarque Real"] > existing["Embarque Real"]))) {
        lgpByCpf.set(cpf, item);
      }
    });

    console.log('Processing and populating reference tables...');

    // Helper caches
    const cacheCentroCusto = new Map();
    const cacheEmpresa = new Map();
    const cacheCargo = new Map();
    const cacheEmbarcacao = new Map();

    // Helper functions to get/insert references
    async function getCentroCustoId(nome) {
      if (!nome) return null;
      const key = nome.toUpperCase().trim();
      if (cacheCentroCusto.has(key)) return cacheCentroCusto.get(key);

      const res = await db.query('SELECT id FROM gt_centros_custo WHERE UPPER(nome) = $1', [key]);
      if (res.rows.length > 0) {
        cacheCentroCusto.set(key, res.rows[0].id);
        return res.rows[0].id;
      }

      const insertRes = await db.query(
        'INSERT INTO gt_centros_custo (nome, codigo) VALUES ($1, $2) RETURNING id',
        [nome, nome.substring(0, 10).toUpperCase()]
      );

      const id = insertRes.rows[0].id;
      cacheCentroCusto.set(key, id);
      return id;
    }

    async function getEmpresaId(nome) {
      if (!nome) return null;
      const key = nome.toUpperCase().trim();
      if (cacheEmpresa.has(key)) return cacheEmpresa.get(key);

      const res = await db.query('SELECT id FROM gt_empresas WHERE UPPER(nome) = $1', [key]);
      if (res.rows.length > 0) {
        cacheEmpresa.set(key, res.rows[0].id);
        return res.rows[0].id;
      }

      const insertRes = await db.query(
        'INSERT INTO gt_empresas (nome) VALUES ($1) RETURNING id',
        [nome]
      );
      const id = insertRes.rows[0].id;
      cacheEmpresa.set(key, id);
      return id;
    }

    async function getCargoId(nome) {
      if (!nome) return null;
      const key = nome.toUpperCase().trim();
      if (cacheCargo.has(key)) return cacheCargo.get(key);

      const res = await db.query('SELECT id FROM gt_cargos WHERE UPPER(nome) = $1', [key]);
      if (res.rows.length > 0) {
        cacheCargo.set(key, res.rows[0].id);
        return res.rows[0].id;
      }

      const insertRes = await db.query(
        'INSERT INTO gt_cargos (nome) VALUES ($1) RETURNING id',
        [nome]
      );
      const id = insertRes.rows[0].id;
      cacheCargo.set(key, id);
      return id;
    }

    async function getEmbarcacaoId(nome, empresaId) {
      if (!nome) return null;
      const key = nome.toUpperCase().trim();
      if (cacheEmbarcacao.has(key)) return cacheEmbarcacao.get(key);

      const res = await db.query('SELECT id FROM gt_embarcacoes WHERE UPPER(nome) = $1', [key]);
      if (res.rows.length > 0) {
        cacheEmbarcacao.set(key, res.rows[0].id);
        return res.rows[0].id;
      }

      const insertRes = await db.query(
        'INSERT INTO gt_embarcacoes (nome, empresa_id) VALUES ($1, $2) RETURNING id',
        [nome, empresaId || null]
      );
      const id = insertRes.rows[0].id;
      cacheEmbarcacao.set(key, id);
      return id;
    }

    let inserted = 0;
    let updated = 0;

    for (const i of activeIntegrantes) {
      const cpf = i.cpf_numero ? i.cpf_numero.replace(/\D/g, '') : '';
      if (!cpf) continue;

      // Find LGP info
      const lgp = lgpByCpf.get(cpf);
      
      // Parse Destination to extract Company and Vessel
      let companyName = 'ABZ Group';
      let vesselName = null;
      
      if (lgp && lgp.Destino) {
        const parts = lgp.Destino.split(' - ');
        if (parts.length > 1) {
          companyName = parts[0].trim();
          vesselName = parts[1].trim();
        } else {
          vesselName = lgp.Destino.trim();
        }
      }

      // Resolve database references
      const centroCustoId = await getCentroCustoId(i.centro_custo || 'ABZ ADM');
      const empresaId = await getEmpresaId(companyName);
      const cargoId = await getCargoId(i.cargo_funcao || 'Tripulante');
      const embarcacaoId = vesselName ? await getEmbarcacaoId(vesselName, empresaId) : null;

      // Determine status_embarque
      let statusEmbarque = 'desembarcado';
      let standby = false;
      if (i.regime && i.regime.toLowerCase() === 'offshore') {
        statusEmbarque = 'standby';
        standby = true;
      }
      if (lgp) {
        const embarkReal = lgp["Embarque Real"];
        const disembarkReal = lgp["Desembarque Real"];
        if (embarkReal && !disembarkReal) {
          statusEmbarque = 'embarcado';
          standby = false;
        } else if (disembarkReal) {
          statusEmbarque = 'folga';
          standby = false;
        }
      }

      // Format phone numbers
      const phone = i.telefone_01 || i.telefone_02 || null;

      // Clean dates
      const birthDate = cleanDate(i.nascido_em);
      const admissionDate = cleanDate(i.admitido_em);

      // Check if collaborator exists
      const checkRes = await db.query('SELECT id FROM gt_colaboradores WHERE cpf = $1', [cpf]);
      if (checkRes.rows.length > 0) {
        // Update
        await db.query(
          `UPDATE gt_colaboradores SET
            nome_completo = $1,
            email = $2,
            telefone = $3,
            data_nascimento = $4,
            nome_mae = $5,
            nome_pai = $6,
            centro_custo_id = $7,
            empresa_id = $8,
            embarcacao_atual_id = $9,
            cargo_id = $10,
            status_embarque = $11,
            standby = $12,
            matricula = $13,
            data_admissao = $14,
            mio_id = $15,
            mio_data = $16,
            ultimo_sync_mio = NOW(),
            updated_at = NOW()
          WHERE id = $17`,
          [
            i.nome_completo,
            i.email || null,
            phone,
            birthDate,
            i.nome_mae || null,
            i.nome_pai || null,
            centroCustoId,
            empresaId,
            embarcacaoId,
            cargoId,
            statusEmbarque,
            standby,
            i.matricula || null,
            admissionDate,
            String(i.id),
            JSON.stringify(i),
            checkRes.rows[0].id
          ]
        );
        updated++;
      } else {
        // Insert
        await db.query(
          `INSERT INTO gt_colaboradores (
            nome_completo, cpf, email, telefone, data_nascimento,
            nome_mae, nome_pai, centro_custo_id, empresa_id,
            embarcacao_atual_id, cargo_id, status_embarque, standby,
            matricula, data_admissao, origem, mio_id, mio_data,
            ultimo_sync_mio, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'mio', $16, $17, NOW(), NOW(), NOW())`,
          [
            i.nome_completo,
            cpf,
            i.email || null,
            phone,
            birthDate,
            i.nome_mae || null,
            i.nome_pai || null,
            centroCustoId,
            empresaId,
            embarcacaoId,
            cargoId,
            statusEmbarque,
            standby,
            i.matricula || null,
            admissionDate,
            String(i.id),
            JSON.stringify(i)
          ]
        );
        inserted++;
      }
    }

    console.log(`\nSincronização completa!`);
    console.log(`- Novos colaboradores inseridos: ${inserted}`);
    console.log(`- Colaboradores atualizados: ${updated}`);

  } catch (error) {
    console.error('Erro na sincronização:', error.message, error.stack);
  } finally {
    await db.end();
  }
}

sync();
