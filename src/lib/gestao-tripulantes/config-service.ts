import { supabaseAdmin } from '@/lib/supabase';

export async function getConfig(
  chave: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('gt_configuracoes')
      .select('valor')
      .eq('chave', chave)
      .maybeSingle();

    if (error) {
      console.error(`Erro ao buscar configuração "${chave}":`, error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data?.valor };
  } catch (error) {
    console.error('Erro inesperado em getConfig:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function getAllConfigs(): Promise<{
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}> {
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('gt_configuracoes')
      .select('chave, valor');

    if (error) {
      console.error('Erro ao buscar todas as configurações:', error);
      return { success: false, error: error.message };
    }

    const configMap: Record<string, any> = {};
    if (data) {
      for (const row of data) {
        configMap[row.chave] = row.valor;
      }
    }

    return { success: true, data: configMap };
  } catch (error) {
    console.error('Erro inesperado em getAllConfigs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function updateConfig(
  chave: string,
  valor: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseAdmin;

    const { error } = await supabase.from('gt_configuracoes').upsert(
      {
        chave,
        valor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chave' }
    );

    if (error) {
      console.error(`Erro ao salvar configuração "${chave}":`, error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro inesperado em updateConfig:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
