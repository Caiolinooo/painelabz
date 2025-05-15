require('dotenv').config();
const fetch = require('node-fetch');

async function testVerificationEndpoint() {
  const testEmail = process.argv[2] || 'test@example.com';
  
  console.log(`Testando endpoint de verificação para ${testEmail}...`);
  
  try {
    const response = await fetch(`http://localhost:3000/api/debug/test-verification?email=${encodeURIComponent(testEmail)}`);
    const data = await response.json();
    
    console.log('Resposta do endpoint:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('Teste concluído com sucesso!');
      console.log('Código gerado:', data.code);
      console.log('URL de preview do email:', data.previewUrl);
      console.log('URL de debug de códigos:', data.debugUrl);
    } else {
      console.error('Erro no teste:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao chamar o endpoint:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

testVerificationEndpoint()
  .then(result => {
    console.log('Teste concluído.');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Erro no teste:', error);
    process.exit(1);
  });
