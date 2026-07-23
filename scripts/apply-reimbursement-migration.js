require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase com chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para criar a configuração de reembolso na API
async function createReimbursementSettings() {
  try {
    console.log('Criando configuração de reembolso via API...');

    // Dados da configuração
    const settings = {
      enableDomainRule: true,
      recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']
    };

    // Fazer requisição para a API
    const response = await fetch(`${supabaseUrl}/rest/v1/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        key: 'reimbursement_email_settings',
        value: settings,
        description: 'Configurações de email para solicitações de reembolso'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro ao criar configuração via API:', errorData);
      return false;
    }

    const data = await response.json();
    console.log('Configuração criada com sucesso via API:', data);
    return true;
  } catch (error) {
    console.error('Erro ao criar configuração via API:', error);
    return false;
  }
}

async function applyMigration() {
  try {
    console.log('Aplicando migração para adicionar configurações de email de reembolso...');

    // Solução alternativa: Criar um arquivo de configuração local
    console.log('Criando arquivo de configuração local...');

    const configDir = path.join(__dirname, '..', 'src', 'config');
    const configFile = path.join(configDir, 'reimbursementSettings.json');

    // Criar diretório se não existir
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Dados da configuração
    const settings = {
      enableDomainRule: true,
      recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']
    };

    // Salvar configuração em arquivo local
    fs.writeFileSync(configFile, JSON.stringify(settings, null, 2));
    console.log(`Arquivo de configuração local criado em ${configFile}`);

    // Criar arquivo de API para servir a configuração
    const apiDir = path.join(__dirname, '..', 'src', 'app', 'api', 'reimbursement-settings-local');
    const apiFile = path.join(apiDir, 'route.ts');

    // Criar diretório se não existir
    if (!fs.existsSync(apiDir)) {
      fs.mkdirSync(apiDir, { recursive: true });
    }

    // Conteúdo do arquivo de API
    const apiContent = `import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET - Obter configurações de email de reembolso do arquivo local
export async function GET(request: NextRequest) {
  try {
    // Caminho para o arquivo de configuração
    const configFile = path.join(process.cwd(), 'src', 'config', 'reimbursementSettings.json');

    // Verificar se o arquivo existe
    if (!fs.existsSync(configFile)) {
      // Retornar valores padrão se o arquivo não existir
      return NextResponse.json({
        enableDomainRule: true,
        recipients: ['andresa.oliveira@groupabz.com', 'fiscal@groupabz.com']
      });
    }

    // Ler arquivo de configuração
    const configData = fs.readFileSync(configFile, 'utf8');
    const config = JSON.parse(configData);

    // Retornar configurações
    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Criar ou atualizar configurações de email de reembolso no arquivo local
export async function POST(request: NextRequest) {
  try {
    // Obter dados do corpo da requisição
    const body = await request.json();
    const { enableDomainRule, recipients } = body;

    // Validar os dados de entrada
    if (typeof enableDomainRule !== 'boolean' || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }

    // Caminho para o arquivo de configuração
    const configDir = path.join(process.cwd(), 'src', 'config');
    const configFile = path.join(configDir, 'reimbursementSettings.json');

    // Criar diretório se não existir
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Salvar configuração em arquivo
    fs.writeFileSync(configFile, JSON.stringify({ enableDomainRule, recipients }, null, 2));

    // Retornar resultado
    return NextResponse.json({
      success: true,
      data: { enableDomainRule, recipients }
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}`;

    // Salvar arquivo de API
    fs.writeFileSync(apiFile, apiContent);
    console.log(`Arquivo de API local criado em ${apiFile}`);

    // Atualizar o arquivo da página para usar a API local
    const pageFile = path.join(__dirname, '..', 'src', 'app', 'admin', 'reimbursement-settings', 'page.tsx');

    if (fs.existsSync(pageFile)) {
      let pageContent = fs.readFileSync(pageFile, 'utf8');

      // Substituir a URL da API
      pageContent = pageContent.replace(
        /const response = await fetch\('\/api\/reimbursement-settings'\);/g,
        "const response = await fetch('/api/reimbursement-settings-local');"
      );

      pageContent = pageContent.replace(
        /const response = await fetch\('\/api\/reimbursement-settings', {/g,
        "const response = await fetch('/api/reimbursement-settings-local', {"
      );

      // Salvar arquivo atualizado
      fs.writeFileSync(pageFile, pageContent);
      console.log(`Arquivo da página atualizado para usar a API local: ${pageFile}`);
    }

    console.log('Migração aplicada com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao aplicar migração:', error);
    return false;
  }
}

// Executar a migração
applyMigration()
  .then(success => {
    if (success) {
      console.log('Migração concluída com sucesso!');
      process.exit(0);
    } else {
      console.error('Falha ao aplicar migração.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
    process.exit(1);
  });
