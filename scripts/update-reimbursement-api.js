require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function updateReimbursementApi() {
  try {
    console.log('Atualizando API de reembolso para usar armazenamento local...');
    
    // Caminho para o arquivo da API de reembolso
    const apiFile = path.join(__dirname, '..', 'src', 'app', 'api', 'reembolso', 'route.ts');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(apiFile)) {
      console.error(`Arquivo não encontrado: ${apiFile}`);
      return false;
    }
    
    // Ler o conteúdo do arquivo
    let content = fs.readFileSync(apiFile, 'utf8');
    
    // Substituir o código que busca configurações de email de reembolso do usuário
    const oldCode = `        // Verificar se o usuário tem configurações específicas de email de reembolso
        let userEmailSettings = null;
        if (email) {
          try {
            const { data: userData, error: userError } = await supabaseAdmin
              .from('users')
              .select('reimbursement_email_settings')
              .eq('email', email)
              .single();

            if (!userError && userData && userData.reimbursement_email_settings) {
              userEmailSettings = userData.reimbursement_email_settings;
              console.log('Configurações de email de reembolso do usuário carregadas:', userEmailSettings);
            }
          } catch (userError) {
            console.error('Erro ao carregar configurações de email de reembolso do usuário:', userError);
          }
        }`;
    
    const newCode = `        // Verificar se o usuário tem configurações específicas de email de reembolso
        let userEmailSettings = null;
        if (email) {
          try {
            // Buscar configurações do arquivo local
            const configDir = path.join(process.cwd(), 'src', 'config', 'users');
            const emailMappingPath = path.join(process.cwd(), 'src', 'config', 'emailToUserId.json');
            
            // Verificar se o mapeamento de email para ID existe
            if (fs.existsSync(emailMappingPath)) {
              const mappingData = fs.readFileSync(emailMappingPath, 'utf8');
              const mapping = JSON.parse(mappingData);
              const userId = mapping[email];
              
              if (userId) {
                const userConfigPath = path.join(configDir, \`\${userId}.json\`);
                
                if (fs.existsSync(userConfigPath)) {
                  const userData = fs.readFileSync(userConfigPath, 'utf8');
                  userEmailSettings = JSON.parse(userData);
                  console.log('Configurações de email de reembolso do usuário carregadas do arquivo local:', userEmailSettings);
                }
              }
            }
            
            // Se não encontrou no arquivo local, tenta buscar do banco de dados
            if (!userEmailSettings) {
              const { data: userData, error: userError } = await supabaseAdmin
                .from('users')
                .select('reimbursement_email_settings')
                .eq('email', email)
                .single();

              if (!userError && userData && userData.reimbursement_email_settings) {
                userEmailSettings = userData.reimbursement_email_settings;
                console.log('Configurações de email de reembolso do usuário carregadas do banco de dados:', userEmailSettings);
              }
            }
          } catch (userError) {
            console.error('Erro ao carregar configurações de email de reembolso do usuário:', userError);
          }
        }`;
    
    // Substituir o código
    content = content.replace(oldCode, newCode);
    
    // Adicionar importações necessárias
    if (!content.includes('import fs from \'fs\';')) {
      content = content.replace('import { NextRequest, NextResponse } from \'next/server\';', 'import { NextRequest, NextResponse } from \'next/server\';\nimport fs from \'fs\';\nimport path from \'path\';');
    }
    
    // Salvar o arquivo atualizado
    fs.writeFileSync(apiFile, content);
    console.log(`Arquivo atualizado: ${apiFile}`);
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar API de reembolso:', error);
    return false;
  }
}

// Executar a atualização
updateReimbursementApi()
  .then(success => {
    if (success) {
      console.log('API de reembolso atualizada com sucesso!');
      process.exit(0);
    } else {
      console.error('Falha ao atualizar API de reembolso.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
