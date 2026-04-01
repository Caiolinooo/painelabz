import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await supabase
      .from('Reimbursement')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        tableAccessible: false
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tableAccessible: true,
      sampleCount: data?.length || 0
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      tableAccessible: false
    }, { status: 500 });
  }
}
