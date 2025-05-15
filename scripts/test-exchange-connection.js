require('dotenv').config();
const nodemailer = require('nodemailer');

async function testExchangeConnection() {
  console.log('Testando conexão com o servidor Exchange...');

  // Obter configurações do arquivo .env
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT);
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  console.log('Configuração carregada:', {
    host,
    port,
    secure,
    user,
    // Não mostrar a senha
  });

  try {
    // Criar transporter com configuração do Exchange
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      },
      tls: {
        // Desativar verificação de certificado em ambiente de desenvolvimento
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });

    console.log('Transporter criado, verificando conexão...');

    // Verificar conexão
    await transporter.verify();

    console.log('Conexão com o servidor Exchange verificada com sucesso!');

    return {
      success: true,
      message: 'Conexão com o servidor Exchange verificada com sucesso!'
    };
  } catch (error) {
    console.error('Erro ao conectar com o servidor Exchange:', error);
    console.error('Detalhes do erro:', error.message);

    return {
      success: false,
      message: `Erro ao conectar: ${error.message}`,
      error
    };
  }
}

// Executar o teste
testExchangeConnection()
  .then(result => {
    console.log('Resultado do teste:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
    process.exit(1);
  });
