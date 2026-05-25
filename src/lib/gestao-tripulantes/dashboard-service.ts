import { supabaseAdmin } from '@/lib/supabase';
import type { GTDashboardResumo } from '@/types/gestao-tripulantes';

export async function getDashboardData(): Promise<{
  success: boolean;
  data?: GTDashboardResumo;
  error?: string;
}> {
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('gt_vw_dashboard_resumo')
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || undefined };
  } catch (error) {
    console.error('Erro inesperado no dashboard-service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
