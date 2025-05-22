import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json();
    console.log('Dados recebidos para criação de reembolso:', formData);

    // TODO: Adicionar lógica real de criação de reembolso aqui
    // Inserir dados no banco de dados, processar anexos, etc.

    // Retornar uma resposta de sucesso temporária
    return NextResponse.json({
      success: true,
      message: 'Reembolso recebido com sucesso (criação temporária)',
      protocolo: 'TEMP-' + Date.now() // Gerar um protocolo temporário
    });

  } catch (error) {
    console.error('Erro ao processar criação de reembolso:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar reembolso' },
      { status: 500 }
    );
  }
}
