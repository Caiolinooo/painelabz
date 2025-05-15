require('dotenv').config();

// Implementar funções de teste diretamente
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Armazenamento em memória para os códigos de verificação
const verificationCodes = [];

function registerCode(identifier, method = 'email') {
  // Gerar código
  const code = generateCode();

  // Calcular data de expiração (15 minutos por padrão)
  const expiryMinutes = 15;
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + expiryMinutes);

  // Registrar o código
  const entry = {
    code,
    identifier,
    method,
    timestamp: new Date(),
    expires,
    used: false
  };

  console.log(`Gerando novo código ${code} para ${identifier} via ${method}`);
  console.log(`Código expira em: ${expires.toISOString()}`);
  console.log(`Códigos em memória antes da limpeza: ${verificationCodes.length}`);

  // Remover códigos antigos para o mesmo identificador
  const index = verificationCodes.findIndex(
    (c) => c.identifier === identifier && c.method === method
  );

  if (index !== -1) {
    console.log(`Removendo código antigo ${verificationCodes[index].code} para ${identifier}`);
    verificationCodes.splice(index, 1);
  }

  // Adicionar o novo código
  verificationCodes.push(entry);
  console.log(`Novo código adicionado. Total de códigos: ${verificationCodes.length}`);

  return {
    code,
    expires
  };
}

function getActiveCodes() {
  return [...verificationCodes];
}

function getLatestCode(identifier) {
  console.log(`Buscando código mais recente para ${identifier}`);
  console.log(`Total de códigos em memória: ${verificationCodes.length}`);
  
  // Listar todos os códigos para o identificador
  const codesForIdentifier = verificationCodes.filter(c => c.identifier === identifier);
  
  console.log(`Códigos encontrados para ${identifier}: ${codesForIdentifier.length}`);
  codesForIdentifier.forEach((c, i) => {
    console.log(`Código ${i+1}: ${c.code}, Método: ${c.method}, Expiração: ${c.expires.toISOString()}, Usado: ${c.used}`);
  });

  // Ordenar por timestamp (mais recente primeiro)
  const sorted = [...codesForIdentifier]
    .filter(c => !c.used)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const latestCode = sorted.length > 0 ? sorted[0].code : null;
  
  if (latestCode) {
    console.log(`Código mais recente para ${identifier}: ${latestCode}`);
  } else {
    console.log(`Nenhum código ativo encontrado para ${identifier}`);
  }
  
  return latestCode;
}

// Função para testar o serviço de códigos
async function testCodeService() {
  console.log('Testando serviço de códigos de verificação...');
  
  // Gerar um código para um email de teste
  const testEmail = 'test@example.com';
  console.log(`Gerando código para ${testEmail}...`);
  
  const result = registerCode(testEmail, 'email');
  console.log('Código gerado:', result.code);
  console.log('Expira em:', result.expires);
  
  // Verificar se o código foi registrado corretamente
  const activeCodes = getActiveCodes();
  console.log('Códigos ativos:', JSON.stringify(activeCodes, null, 2));
  
  // Obter o código mais recente para o email
  const latestCode = getLatestCode(testEmail);
  console.log('Código mais recente para', testEmail, ':', latestCode);
  
  // Gerar outro código para o mesmo email
  console.log('Gerando outro código para o mesmo email...');
  const result2 = registerCode(testEmail, 'email');
  console.log('Novo código gerado:', result2.code);
  
  // Verificar se o código antigo foi substituído
  const latestCode2 = getLatestCode(testEmail);
  console.log('Código mais recente após segunda geração:', latestCode2);
  
  return {
    success: true,
    code1: result.code,
    code2: result2.code,
    latestCode: latestCode2,
    activeCodes: getActiveCodes()
  };
}

// Executar o teste
testCodeService()
  .then(result => {
    console.log('Teste concluído com sucesso!');
    console.log('Resultado:', result);
  })
  .catch(error => {
    console.error('Erro ao executar teste:', error);
  });
