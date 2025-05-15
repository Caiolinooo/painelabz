import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/supabase';

// Função para buscar todas as configurações
export async function getAllSettings() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'settings'>[];
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    throw error;
  }
}

// Função para buscar uma configuração pela chave
export async function getSettingByKey(key: string) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'settings'>;
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    throw error;
  }
}

// Função para criar uma configuração
export async function createSetting(key: string, value: any, description?: string) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .insert({
        key,
        value,
        description,
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'settings'>;
  } catch (error) {
    console.error('Erro ao criar configuração:', error);
    throw error;
  }
}

// Função para atualizar uma configuração
export async function updateSetting(key: string, value: any) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', key)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as Tables<'settings'>;
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    throw error;
  }
}

// Função para excluir uma configuração
export async function deleteSetting(key: string) {
  try {
    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('key', key);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir configuração:', error);
    throw error;
  }
}
