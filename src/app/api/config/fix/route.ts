import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Rota para corrigir configurações automaticamente
export async function POST() {
  try {
    console.log('🔧 Iniciando correção automática das configurações...');

    // 1. Primeiro tentar limpar apenas os valores sem alterar a estrutura
    console.log('Limpando valores padrão...');

    // Buscar configuração atual
    const { data: currentConfig } = await supabaseAdmin
      .from('SiteConfig')
      .select('*')
      .eq('id', 'default')
      .single();

    console.log('Configuração atual:', currentConfig);

    // Preparar update apenas com campos que existem
    const updateData: any = {};

    // Tentar limpar cada campo
    if (currentConfig && 'sidebarTitle' in currentConfig) {
      updateData.sidebarTitle = null;
    }
    if (currentConfig && 'dashboardTitle' in currentConfig) {
      updateData.dashboardTitle = null;
    }
    if (currentConfig && 'dashboardDescription' in currentConfig) {
      updateData.dashboardDescription = null;
    }

    console.log('Atualizando com:', updateData);

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('SiteConfig')
        .update(updateData)
        .eq('id', 'default');

      if (updateError) {
        console.error('Erro ao limpar valores:', updateError);
        return NextResponse.json(
          {
            error: 'Erro ao limpar valores',
            details: updateError.message,
            hint: 'Você precisa executar o SQL no Supabase manualmente para adicionar a coluna sidebarTitle'
          },
          { status: 500 }
        );
      }
    }

    console.log('✅ Valores limpos com sucesso!');

    // 2. Retornar configuração atualizada
    const { data, error: fetchError } = await supabaseAdmin
      .from('SiteConfig')
      .select('*')
      .eq('id', 'default')
      .single();

    if (fetchError) {
      console.error('Erro ao buscar configuração:', fetchError);
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações corrigidas com sucesso',
      config: data,
      clearedFields: Object.keys(updateData)
    });
  } catch (error: any) {
    console.error('Erro ao corrigir configurações:', error);
    return NextResponse.json(
      { error: 'Erro interno', details: error.message },
      { status: 500 }
    );
  }
}
