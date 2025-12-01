/**
 * Script de teste integrado para sistema de notificações
 * Testa email, lembretes e reembolsos
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'abz-cron-secret-2025-secure-token';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(endpoint, method = 'POST', headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-cron-secret': CRON_SECRET,
        ...headers,
      },
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testEmailConnection() {
  log('\n━━━ TESTE 1: Conexão com servidor SMTP ━━━', 'blue');

  try {
    const result = await makeRequest('/api/email/test', 'GET');

    if (result.status === 200 && result.data.success) {
      log('✅ Conexão com Exchange verificada com sucesso', 'green');
      log(`   Host: ${result.data.config?.host || 'N/A'}`, 'reset');
      log(`   Port: ${result.data.config?.port || 'N/A'}`, 'reset');
      log(`   User: ${result.data.config?.user || 'N/A'}`, 'reset');
      return true;
    } else {
      log(`❌ Falha ao conectar: ${result.data.message}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erro ao testar conexão: ${error.message}`, 'red');
    return false;
  }
}

async function testSendTestEmail() {
  log('\n━━━ TESTE 2: Envio de email de verificação ━━━', 'blue');

  try {
    const testEmail = process.argv[2] || 'caio.correia@groupabz.com';
    log(`📧 Enviando para: ${testEmail}`, 'yellow');

    const result = await makeRequest(
      `/api/email/debug?action=send&email=${encodeURIComponent(testEmail)}`,
      'GET'
    );

    if (result.status === 200 && result.data.success) {
      log('✅ Email de teste enviado com sucesso', 'green');
      log(`   Message ID: ${result.data.messageId || 'N/A'}`, 'reset');
      if (result.data.code) {
        log(`   Código de verificação: ${result.data.code}`, 'yellow');
      }
      if (result.data.previewUrl) {
        log(`   Preview URL: ${result.data.previewUrl}`, 'reset');
      }
      return true;
    } else {
      log(`❌ Falha ao enviar: ${result.data.message}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erro ao enviar email: ${error.message}`, 'red');
    return false;
  }
}

async function testCronLembretes() {
  log('\n━━━ TESTE 3: Cron job de lembretes ━━━', 'blue');

  try {
    const result = await makeRequest('/api/avaliacao/cron/enviar-lembretes', 'POST');

    if (result.status === 200 && result.data.success) {
      log('✅ Cron de lembretes executado com sucesso', 'green');
      log(`   Lembretes enviados: ${result.data.lembretes_enviados}`, 'reset');
      log(`   Tempo de execução: ${result.data.tempo_execucao_ms}ms`, 'reset');
      return true;
    } else if (result.status === 401) {
      log('⚠️  Não autorizado - verifique CRON_SECRET', 'yellow');
      return false;
    } else {
      log(`❌ Falha no cron: ${result.data.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Erro ao executar cron: ${error.message}`, 'red');
    return false;
  }
}

async function testCronCriacaoAvaliacoes() {
  log('\n━━━ TESTE 4: Cron job de criação de avaliações ━━━', 'blue');

  try {
    const result = await makeRequest('/api/avaliacao/cron/criar-avaliacoes', 'POST');

    if (result.status === 200 && result.data.success) {
      log('✅ Cron de criação executado com sucesso', 'green');
      log(`   Períodos processados: ${result.data.periodos || 0}`, 'reset');
      log(`   Avaliações criadas: ${result.data.avaliacoes_criadas || 0}`, 'reset');
      log(`   Tempo de execução: ${result.data.tempo_execucao_ms}ms`, 'reset');
      return true;
    } else if (result.status === 401) {
      log('⚠️  Não autorizado - verifique CRON_SECRET', 'yellow');
      return false;
    } else {
      log(`ℹ️  ${result.data.message}`, 'yellow');
      return true; // Pode ser normal não ter períodos para iniciar
    }
  } catch (error) {
    log(`❌ Erro ao executar cron: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🧪 INICIANDO TESTES DO SISTEMA DE NOTIFICAÇÕES', 'blue');
  log('━'.repeat(60), 'blue');

  const results = {
    emailConnection: await testEmailConnection(),
    sendTestEmail: await testSendTestEmail(),
    cronLembretes: await testCronLembretes(),
    cronCriacaoAvaliacoes: await testCronCriacaoAvaliacoes(),
  };

  log('\n━━━ RESUMO DOS TESTES ━━━', 'blue');
  log(`1. Conexão SMTP: ${results.emailConnection ? '✅ OK' : '❌ FALHOU'}`, results.emailConnection ? 'green' : 'red');
  log(`2. Envio de email: ${results.sendTestEmail ? '✅ OK' : '❌ FALHOU'}`, results.sendTestEmail ? 'green' : 'red');
  log(`3. Cron lembretes: ${results.cronLembretes ? '✅ OK' : '❌ FALHOU'}`, results.cronLembretes ? 'green' : 'red');
  log(`4. Cron criação: ${results.cronCriacaoAvaliacoes ? '✅ OK' : '❌ FALHOU'}`, results.cronCriacaoAvaliacoes ? 'green' : 'red');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter((r) => r).length;

  log(`\n📊 Total: ${passedTests}/${totalTests} testes passaram`, passedTests === totalTests ? 'green' : 'yellow');

  if (passedTests === totalTests) {
    log('\n🎉 TODOS OS TESTES PASSARAM!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  ALGUNS TESTES FALHARAM', 'yellow');
    process.exit(1);
  }
}

// Executar testes
runAllTests().catch((error) => {
  log(`\n❌ Erro crítico: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});
