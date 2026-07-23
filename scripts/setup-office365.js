/**
 * Script para configurar o Microsoft Exchange/Office 365
 * Este script ajuda a configurar as variáveis de ambiente para usar o Exchange/Office 365
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Criar interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para perguntar ao usuário
function pergunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, (resposta) => {
      resolve(resposta);
    });
  });
}

// Função para atualizar o arquivo .env
async function atualizarEnv(email, senha, nome) {
  try {
    // Ler o arquivo .env
    const envPath = path.join(process.cwd(), '.env');
    let envContent = await fs.readFile(envPath, 'utf8');

    // Extrair o domínio do email
    const dominio = email.split('@')[1];

    // Preparar as novas configurações
    const novasConfigs = `# Configurações de Email (Microsoft Exchange/Office 365)
EMAIL_SERVER=smtp://${email}:${senha}@smtp.office365.com:587
EMAIL_FROM="${nome}" <${email}>
EMAIL_USER=${email}
EMAIL_PASSWORD=${senha}
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_REPLY_TO=${email}`;

    // Verificar se já existem configurações de email
    if (envContent.includes('# Configurações de Email')) {
      // Substituir as configurações existentes
      const regex = /# Configurações de Email \(Microsoft Exchange\/Office 365\)[\s\S]*?(?=\n\n# Configurações de personalização de emails|\n\n# Configurações de Ambiente|$)/;
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, novasConfigs);
      } else {
        // Se não encontrar o padrão exato, procurar por qualquer configuração de email
        const emailRegex = /# Configurações de Email[\s\S]*?(?=\n\n# Configurações de personalização de emails|\n\n# Configurações de Ambiente|$)/;
        envContent = envContent.replace(emailRegex, novasConfigs);
      }
    } else {
      // Adicionar as configurações no final do arquivo
      envContent += `\n\n${novasConfigs}`;
    }

    // Salvar o arquivo .env
    await fs.writeFile(envPath, envContent, 'utf8');
    console.log(`${colors.green}${colors.bold}✓ Arquivo .env atualizado com sucesso!${colors.reset}`);

    return true;
  } catch (error) {
    console.error(`${colors.red}${colors.bold}✗ Erro ao atualizar o arquivo .env:${colors.reset}`, error.message);
    return false;
  }
}

// Função para testar a configuração
async function testarConfiguracao(email) {
  try {
    console.log(`${colors.blue}${colors.bold}Testando a configuração...${colors.reset}`);
    
    // Executar o script de teste
    execSync(`node scripts/test-exchange-config.js ${email}`, { stdio: 'inherit' });
    
    return true;
  } catch (error) {
    console.error(`${colors.red}${colors.bold}✗ Erro ao testar a configuração:${colors.reset}`, error.message);
    return false;
  }
}

// Função para exibir instruções de DNS
async function exibirInstrucoesDNS(dominio) {
  console.log(`\n${colors.blue}${colors.bold}=== Configuração de DNS para ${dominio} ===${colors.reset}`);
  console.log(`\nPara garantir a entregabilidade dos emails, configure os seguintes registros DNS:`);
  
  console.log(`\n${colors.bold}1. Registro SPF (Sender Policy Framework)${colors.reset}`);
  console.log(`Tipo: TXT`);
  console.log(`Nome/Host: @ (ou domínio raiz)`);
  console.log(`Valor: ${colors.cyan}v=spf1 include:spf.protection.outlook.com -all${colors.reset}`);
  
  console.log(`\n${colors.bold}2. Registro DMARC${colors.reset}`);
  console.log(`Tipo: TXT`);
  console.log(`Nome/Host: _dmarc`);
  console.log(`Valor: ${colors.cyan}v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc@${dominio}; ruf=mailto:dmarc@${dominio}; fo=1; adkim=r; aspf=r;${colors.reset}`);
  
  console.log(`\n${colors.bold}3. Para configurar DKIM${colors.reset}`);
  console.log(`Acesse o Centro de administração do Microsoft 365 (admin.microsoft.com)`);
  console.log(`Navegue para: Configurações > Domínios > Selecione seu domínio > DNS records`);
  console.log(`Siga as instruções para configurar o DKIM para seu domínio`);
  
  console.log(`\n${colors.yellow}${colors.bold}Para mais informações, consulte:${colors.reset}`);
  console.log(`- docs/EMAIL_CONFIGURATION.md`);
  console.log(`- https://docs.microsoft.com/pt-br/microsoft-365/security/office-365-security/email-authentication-dmarc-configure`);
}

// Função principal
async function main() {
  console.log(`${colors.magenta}${colors.bold}====================================${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}= CONFIGURAÇÃO DO EXCHANGE/OFFICE 365 =${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}====================================${colors.reset}\n`);
  
  console.log(`Este script irá ajudá-lo a configurar o Microsoft Exchange/Office 365 para envio de emails.\n`);
  
  // Perguntar informações ao usuário
  const email = await pergunta(`${colors.bold}Digite o email do Office 365 (ex: contato@seudominio.com):${colors.reset} `);
  if (!email || !email.includes('@') || !email.includes('.')) {
    console.log(`${colors.red}${colors.bold}✗ Email inválido!${colors.reset}`);
    rl.close();
    return;
  }
  
  const dominio = email.split('@')[1];
  
  const senha = await pergunta(`${colors.bold}Digite a senha do email:${colors.reset} `);
  if (!senha) {
    console.log(`${colors.red}${colors.bold}✗ Senha não pode ser vazia!${colors.reset}`);
    rl.close();
    return;
  }
  
  const nome = await pergunta(`${colors.bold}Digite o nome de exibição (ex: ABZ Group):${colors.reset} `);
  if (!nome) {
    console.log(`${colors.red}${colors.bold}✗ Nome não pode ser vazio!${colors.reset}`);
    rl.close();
    return;
  }
  
  // Atualizar o arquivo .env
  const envAtualizado = await atualizarEnv(email, senha, nome);
  if (!envAtualizado) {
    rl.close();
    return;
  }
  
  // Perguntar se deseja testar a configuração
  const testar = await pergunta(`\n${colors.bold}Deseja testar a configuração agora? (s/n):${colors.reset} `);
  if (testar.toLowerCase() === 's') {
    const emailTeste = await pergunta(`${colors.bold}Digite um email para receber o teste:${colors.reset} `);
    if (!emailTeste || !emailTeste.includes('@') || !emailTeste.includes('.')) {
      console.log(`${colors.red}${colors.bold}✗ Email de teste inválido!${colors.reset}`);
    } else {
      await testarConfiguracao(emailTeste);
    }
  }
  
  // Exibir instruções de DNS
  await exibirInstrucoesDNS(dominio);
  
  console.log(`\n${colors.green}${colors.bold}✓ Configuração concluída!${colors.reset}`);
  console.log(`\nPara mais informações sobre como melhorar a entregabilidade dos emails, consulte:`);
  console.log(`- docs/EMAIL_CONFIGURATION.md`);
  
  rl.close();
}

// Executar função principal
main().catch(error => {
  console.error(`${colors.red}Erro não tratado: ${error.message}${colors.reset}`);
  rl.close();
  process.exit(1);
});
