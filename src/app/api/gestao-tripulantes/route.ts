import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      module: 'gestao-tripulantes',
      version: '1.0.0',
      status: 'active'
    });
  } catch (error) {
    console.error('Erro no health check gestao-tripulantes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
