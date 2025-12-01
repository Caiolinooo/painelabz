/**
 * Script para testar o cron job de lembretes localmente
 */

async function testLembretesCron() {
  console.log('🧪 Iniciando teste do cron job de lembretes...\n');

  const API_URL = 'http://localhost:3000/api/avaliacao/cron/enviar-lembretes';

  try {
    console.log(`📡 Fazendo requisição para: ${API_URL}`);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-cron-secret': process.env.CRON_SECRET || 'abz-cron-secret-2025-secure-token',
      },
    });

    const data = await response.json();

    console.log('\n📊 Resposta do servidor:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Teste bem-sucedido!');
      console.log(`📧 Lembretes enviados: ${data.lembretes_enviados}`);
      console.log(`⏱️  Tempo de execução: ${data.tempo_execucao_ms}ms`);
    } else {
      console.log('\n❌ Teste falhou:', data.error);
    }
  } catch (error) {
    console.error('\n❌ Erro ao executar teste:', error.message);
    console.error(error.stack);
  }
}

// Executar teste
testLembretesCron();
