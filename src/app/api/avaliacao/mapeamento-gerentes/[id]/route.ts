/**
 * API Route: Individual Manager Mapping Operations
 * PUT    /api/avaliacao/mapeamento-gerentes/[id] - Update mapping
 * DELETE /api/avaliacao/mapeamento-gerentes/[id] - Delete mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

// Safely create client, or return null if keys missing (during build)
const supabase: SupabaseClient | null = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Configuration Error' }, { status: 500 });
    }
    const { id } = params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('avaliacao_colaborador_gerente')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Configuration Error' }, { status: 500 });
    }
    const { id } = params;

    const { error } = await supabase
      .from('avaliacao_colaborador_gerente')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Mapping deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
