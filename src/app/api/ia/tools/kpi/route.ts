import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { input } = await request.json();
    
    // Validate input
    if (!input.kpi_id || !input.kpi_label || input.kpi_value === undefined || input.kpi_target === input.kpi_value) {
      return NextResponse.json({ 
        success: false, 
        message: 'Parâmetros insuficientes para criar/atualizar KPI' 
      }, { status: 400 });
    }

    // Check if KPI exists
    const { data: existingKpi, error: fetchError } = await supabaseAdmin
      .from('kpi_targets')
      .select('*')
      .eq('id', input.kpi_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[API] Erro ao buscar KPI:', fetchError);
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao verificar KPI existente' 
      }, { status: 500 });
    }

    if (existingKpi) {
      // Update existing KPI
      const { error: updateError } = await supabaseAdmin
        .from('kpi_targets')
        .update({
          kpi_label: input.kpi_label,
          current_value: input.kpi_value,
          target_value: input.kpi_target,
          description: input.kpi_description,
          unit: input.kpi_unit
        })
        .eq('id', input.kpi_id);

      if (updateError) {
        console.error('[API] Erro ao atualizar KPI:', updateError);
        return NextResponse.json({ 
          success: false, 
          message: 'Erro ao atualizar KPI: ' + updateError.message 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'KPI atualizado com sucesso' 
      });
    } else {
      // Create new KPI
      const newKpi = {
        id: input.kpi_id,
        kpi_label: input.kpi_label,
        current_value: input.kpi_value,
        target_value: input.kpi_target,
        description: input.kpi_description,
        unit: input.kpi_unit
      };

      const { error: insertError } = await supabaseAdmin
        .from('kpi_targets')
        .insert([newKpi]);

      if (insertError) {
        console.error('[API] Erro ao criar KPI:', insertError);
        return NextResponse.json({ 
          success: false, 
          message: 'Erro ao criar KPI: ' + insertError.message 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'KPI criado com sucesso' 
      });
    }
  } catch (error) {
    console.error('[API] Erro ao processar KPI:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno: ' + error 
    }, { status: 500 });
  }
}