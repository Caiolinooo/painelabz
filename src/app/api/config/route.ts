import { NextRequest, NextResponse } from 'next/server';
import { SiteConfig } from '@/data/config';
import { supabaseAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Configuração padrão do site
const defaultConfig: SiteConfig = {
  title: "Portal ABZ",
  description: "Portal centralizado para colaboradores da ABZ Group",
  logo: "/images/LC1_Azul.png",
  favicon: "/favicon.ico",
  primaryColor: "#005dff", // abz-blue
  secondaryColor: "#6339F5", // abz-purple
  companyName: "ABZ Group",
  contactEmail: "contato@groupabz.com",
  footerText: "© 2024 ABZ Group. Todos os direitos reservados.",
  dashboardTitle: "Painel de Logística ABZ Group",
  dashboardDescription: "Bem-vindo ao centro de recursos para colaboradores da logística.",
  sidebarTitle: "Portal ABZ",
  googleClientId: "",
  googleClientSecret: "",
  googleRedirectUri: "",
  login_logo: "",
  sidebar_logo: "",
  widget_logo: ""
};

// GET - Obter a configuração do site
export async function GET() {
  try {
    console.log('🔍 [API GET] Buscando configurações do site');

    const { data, error } = await supabaseAdmin
      .from('SiteConfig')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('❌ [API GET] Erro ao buscar configuração:', error);
      console.log('⚠️ [API GET] Retornando configuração padrão devido ao erro');
      return NextResponse.json(defaultConfig);
    }

    if (!data) {
      console.log('⚠️ [API GET] Configuração não encontrada, retornando valores padrão');
      return NextResponse.json(defaultConfig);
    }

    console.log('✅ [API GET] Configuração encontrada no banco:', {
      id: data.id,
      title: data.title,
      sidebarTitle: data.sidebarTitle,
      dashboardTitle: data.dashboardTitle,
      dashboardDescription: data.dashboardDescription
    });

    // NÃO misturar com defaultConfig - retornar EXATAMENTE o que está no banco
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [API GET] Erro ao obter configuração:', error);
    // Em caso de erro, retornar a configuração padrão em vez de um erro
    return NextResponse.json(defaultConfig);
  }
}

// PUT - Atualizar a configuração do site
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      logo,
      favicon,
      primaryColor,
      secondaryColor,
      companyName,
      contactEmail,
      footerText,
      dashboardTitle,
      dashboardDescription,
      sidebarTitle,
      googleClientId,
      googleClientSecret,
      googleRedirectUri,
      login_logo,
      sidebar_logo,
      widget_logo
    } = body;

    // Validar os dados de entrada obrigatórios (apenas title e companyName)
    if (!title || !companyName) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: title, companyName' },
        { status: 400 }
      );
    }

    // Verificar se a configuração existe
    const { data: existingConfig, error: checkError } = await supabaseAdmin
      .from('SiteConfig')
      .select('id')
      .eq('id', 'default')
      .maybeSingle();

    if (checkError) {
      console.error('Erro ao verificar configuração existente:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar configuração existente' },
        { status: 500 }
      );
    }

    const configData = {
      title,
      description,
      logo,
      favicon,
      primaryColor,
      secondaryColor,
      companyName,
      contactEmail,
      footerText,
      dashboardTitle,
      dashboardDescription,
      sidebarTitle,
      googleClientId,
      googleClientSecret,
      googleRedirectUri,
      login_logo,
      sidebar_logo,
      widget_logo,
      updatedAt: new Date()
    };

    let result;

    if (!existingConfig) {
      // Criar nova configuração
      console.log('Criando nova configuração');
      const { data, error: insertError } = await supabaseAdmin
        .from('SiteConfig')
        .insert({
          id: 'default',
          ...configData
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar configuração:', insertError);
        return NextResponse.json(
          { error: 'Erro ao criar configuração' },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Atualizar configuração existente
      console.log('📝 [API PUT] Atualizando configuração existente');
      console.log('📝 [API PUT] Dados a serem salvos:', {
        title: configData.title,
        sidebarTitle: configData.sidebarTitle,
        dashboardTitle: configData.dashboardTitle,
        dashboardDescription: configData.dashboardDescription
      });

      const { data, error: updateError } = await supabaseAdmin
        .from('SiteConfig')
        .update(configData)
        .eq('id', 'default')
        .select()
        .single();

      if (updateError) {
        console.error('❌ [API PUT] Erro ao atualizar configuração:', updateError);
        console.error('❌ [API PUT] Dados enviados:', configData);
        return NextResponse.json(
          { error: 'Erro ao atualizar configuração', details: updateError.message, hint: updateError.hint },
          { status: 500 }
        );
      }

      console.log('✅ [API PUT] Configuração atualizada com sucesso:', {
        id: data.id,
        title: data.title,
        sidebarTitle: data.sidebarTitle,
        dashboardTitle: data.dashboardTitle,
        dashboardDescription: data.dashboardDescription
      });

      result = data;
    }

    console.log('✅ [API PUT] Retornando resultado final:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
