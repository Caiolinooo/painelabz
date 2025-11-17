import { NextRequest, NextResponse } from 'next/server';
import { detectAndGenerateTranslations } from '@/lib/auto-translate';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const projectPath = path.join(process.cwd());
    const result = await detectAndGenerateTranslations(projectPath);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao detectar traduções:', error);
    return NextResponse.json({ error: 'Erro ao processar traduções' }, { status: 500 });
  }
}
