import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeFullRecord } from '@/lib/employee-hub/employee-hub-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'ID do colaborador obrigatório' }, { status: 400 });
    }

    const record = await getEmployeeFullRecord(id);
    if (!record) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (err: any) {
    console.error('[employee-hub] Error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
