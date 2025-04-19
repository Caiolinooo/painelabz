import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'ABZ Panel API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
}
