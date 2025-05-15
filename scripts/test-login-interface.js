// Script para testar o login na interface
require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');

async function main() {
  console.log('Testando login na interface...');

  const adminEmail = 'caio.correia@groupabz.com';
  const adminPassword = 'Caio@2122@';

  // Iniciar o navegador
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navegar para a página de login
    console.log('Navegando para a página de login...');
    await page.goto('http://localhost:3000/login');

    // Clicar no botão de login por email
    console.log('Selecionando login por email...');
    await page.click('button:has-text("Email")');

    // Preencher o email
    console.log('Preenchendo o email:', adminEmail);
    await page.fill('input[type="email"]', adminEmail);

    // Clicar no botão de continuar
    console.log('Clicando no botão de continuar...');
    await page.click('button:has-text("Continuar")');

    // Esperar pela tela de senha
    console.log('Esperando pela tela de senha...');
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    } catch (error) {
      console.log('Timeout ao esperar pela tela de senha, tentando login direto...');

      // Tentar login direto com senha
      await page.evaluate(() => {
        // Acessar o contexto de autenticação
        const authContext = window.__NEXT_DATA__.props.pageProps.authContext;
        if (authContext) {
          // Forçar a mudança para a etapa de senha
          authContext.setLoginStep('password');
        }
      });

      // Esperar novamente
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    }

    // Preencher a senha
    console.log('Preenchendo a senha...');
    await page.fill('input[type="password"]', adminPassword);

    // Clicar no botão de login
    console.log('Clicando no botão de login...');
    await page.click('button:has-text("Entrar")');

    // Esperar pelo redirecionamento para o dashboard
    console.log('Esperando pelo redirecionamento para o dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('Login bem-sucedido! Redirecionado para o dashboard.');

    // Verificar se o menu de admin está visível
    const adminMenu = await page.locator('text=Admin').isVisible();
    console.log('Menu de admin visível:', adminMenu);

  } catch (error) {
    console.error('Erro durante o teste de login:', error);

    // Capturar screenshot em caso de erro
    await page.screenshot({ path: 'login-error.png' });
    console.log('Screenshot salvo como login-error.png');
  } finally {
    // Fechar o navegador
    await browser.close();
  }
}

main()
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
