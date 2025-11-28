import { NextRequest, NextResponse } from 'next/server';
import { testEmailConnection, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * API para testar a conexão com o Exchange/Office 365
 * @route GET /api/email/test-gmail (mantido o nome para compatibilidade)
 */
export async function GET(request: NextRequest) {
  try {
    // Obter parâmetros da URL
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email') || '***REMOVED***';

    console.log('Testando conexão com Exchange/Office 365...');

    // Testar conexão
    const connectionResult = await testEmailConnection();

    if (!connectionResult.success) {
      throw new Error(connectionResult.message);
    }

    console.log('Conexão verificada com sucesso!');

    // Enviar email de teste
    if (email) {
      console.log(`Enviando email de teste para ${email}...`);

      const result = await sendEmail(
        email,
        "Teste de Email - ABZ Group (Exchange)",
        "Este é um email de teste do sistema ABZ Group via Exchange.",
        "<p>Este é um email de teste do sistema <strong>ABZ Group</strong> via Exchange.</p>"
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      console.log('Email enviado com sucesso:', result.messageId);

      return NextResponse.json({
        success: true,
        message: 'Conexão verificada e email enviado com sucesso',
        messageId: result.messageId,
        config: connectionResult.config
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão com Exchange verificada com sucesso',
      config: connectionResult.config
    });
  } catch (error) {
    console.error('Erro ao testar conexão com Exchange:', error);

    return NextResponse.json(
      {
        success: false,
        message: `Erro ao testar conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error: error instanceof Error ? error.stack : 'Sem stack trace'
      },
      { status: 500 }
    );
  }
}
