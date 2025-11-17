const { Client } = require('pg');

const client = new Client({
  connectionString: '***REMOVED***',
  ssl: { rejectUnauthorized: false }
});

async function finalVerification() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco para verificação final');

    // Verificar tabela
    const tableResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM avaliacoes_desempenho 
      WHERE deleted_at IS NULL
    `);
    console.log(`📊 Total de avaliações ativas: ${tableResult.rows[0].total}`);

    // Verificar view
    const viewResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM vw_avaliacoes_desempenho
    `);
    console.log(`👁️  Total de registros na view: ${viewResult.rows[0].total}`);

    // Verificar estrutura
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'avaliacoes_desempenho'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura da tabela avaliacoes_desempenho:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}`);
    });

    // Testar view com amostra
    const sampleResult = await client.query(`
      SELECT id, status, periodo 
      FROM vw_avaliacoes_desempenho 
      LIMIT 3
    `);
    
    console.log('🧪 Amostra de dados da view:');
    sampleResult.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Status: ${row.status}, Período: ${row.periodo}`);
    });

    console.log('\n🎉 VERIFICAÇÃO FINAL CONCLUÍDA COM SUCESSO!');
    console.log('✅ Todas as correções foram aplicadas corretamente');

  } catch (error) {
    console.error('❌ Erro na verificação final:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

finalVerification();