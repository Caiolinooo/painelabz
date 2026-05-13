import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Configurando tabela site_config...');

    // Configuração padrão
    const defaultConfig = {
      title: "Portal ABZ",
      description: "Portal centralizado para colaboradores da ABZ Group",
      logo: "/images/LC1_Azul.png",
      favicon: "/favicon.ico",
      primaryColor: "#005dff",
      secondaryColor: "#6339F5",
      companyName: "ABZ Group",
      contactEmail: "contato@groupabz.com",
      footerText: "© 2024 ABZ Group. Todos os direitos reservados.",
      dashboardTitle: "Painel de Logística ABZ Group",
      sidebarTitle: "Portal ABZ",
      googleClientId: "",
      googleClientSecret: "",
      googleRedirectUri: ""
    };

    // Tentar inserir a configuração padrão
    const { data: config, error: insertError } = await supabaseAdmin
      .from('site_config')
      .insert(defaultConfig)
      .select()
      .single();

    if (insertError) {
      // Se a tabela não existir, retornar instruções para criar
      if (insertError.code === 'PGRST116' || (insertError.message && insertError.message.includes('relation "site_config" does not exist'))) {
        return NextResponse.json({
          error: 'Tabela site_config não existe',
          message: 'Execute o SQL abaixo no Supabase Dashboard para criar a tabela',
          sql: `
-- Criar tabela de configurações do site
CREATE TABLE IF NOT EXISTS site_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL DEFAULT 'Portal ABZ',
  description TEXT DEFAULT 'Portal centralizado para colaboradores da ABZ Group',
  logo VARCHAR(500) DEFAULT '/images/LC1_Azul.png',
  favicon VARCHAR(500) DEFAULT '/favicon.ico',
  "primaryColor" VARCHAR(7) DEFAULT '#005dff',
  "secondaryColor" VARCHAR(7) DEFAULT '#6339F5',
  "companyName" VARCHAR(255) DEFAULT 'ABZ Group',
  "contactEmail" VARCHAR(255) DEFAULT 'contato@groupabz.com',
  "footerText" TEXT DEFAULT '© 2024 ABZ Group. Todos os direitos reservados.',
  "dashboardTitle" VARCHAR(255) DEFAULT 'Painel de Logística ABZ Group',
  "dashboardDescription" TEXT DEFAULT 'Bem-vindo ao centro de recursos para colaboradores da logística.',
  "sidebarTitle" VARCHAR(255) DEFAULT 'Portal ABZ',
  "googleClientId" TEXT DEFAULT '',
  "googleClientSecret" TEXT DEFAULT '',
  "googleRedirectUri" TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO site_config (
  title, description, logo, favicon, "primaryColor", "secondaryColor",
  "companyName", "contactEmail", "footerText", "dashboardTitle", "dashboardDescription", "sidebarTitle",
  "googleClientId", "googleClientSecret", "googleRedirectUri"
) VALUES (
  'Portal ABZ',
  'Portal centralizado para colaboradores da ABZ Group',
  '/images/LC1_Azul.png',
  '/favicon.ico',
  '#005dff',
  '#6339F5',
  'ABZ Group',
  'contato@groupabz.com',
  '© 2024 ABZ Group. Todos os direitos reservados.',
  'Painel de Logística ABZ Group',
  'Bem-vindo ao centro de recursos para colaboradores da logística.',
  'Portal ABZ',
  '',
  '',
  ''
);

-- RLS (Row Level Security)
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura de configurações" ON site_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir escrita apenas para administradores
CREATE POLICY "Permitir escrita apenas para admins" ON site_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users_unified 
      WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'MANAGER')
    )
  );
          `,
          instructions: [
            '1. Acesse o Supabase Dashboard',
            '2. Vá para SQL Editor',
            '3. Execute o SQL acima',
            '4. Tente novamente esta API'
          ]
        }, { status: 400 });
      }

      // Se já existe configuração, retornar erro
      if (insertError.code === '23505') {
        return NextResponse.json({
          error: 'Configuração já existe',
          message: 'A tabela site_config já possui dados'
        }, { status: 400 });
      }

      console.error('Erro ao inserir configuração:', insertError);
      return NextResponse.json({
        error: 'Erro ao criar configuração padrão',
        details: insertError
      }, { status: 500 });
    }

    console.log('✅ Configuração padrão criada com sucesso');

    return NextResponse.json({
      message: 'Tabela site_config configurada com sucesso',
      config: config
    });

  } catch (error) {
    console.error('❌ Erro ao configurar site_config:', error);
    return NextResponse.json({
      error: 'Erro interno ao configurar tabela',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API para configurar tabela site_config',
    description: 'Use POST para criar a tabela e inserir configuração padrão',
    endpoints: {
      POST: 'Cria a tabela site_config e insere configuração padrão'
    }
  });
}
