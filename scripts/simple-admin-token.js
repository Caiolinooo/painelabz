// Script simples para gerar um token de administrador
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Configurações
const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
const adminId = '00000000-0000-0000-0000-000000000000'; // ID fixo para o administrador
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';

console.log('Gerando token de administrador...');
console.log('JWT_SECRET presente:', jwtSecret ? 'Sim' : 'Não');
console.log('Comprimento do JWT_SECRET:', jwtSecret.length);
console.log('ID do administrador:', adminId);
console.log('Telefone do administrador:', adminPhone);

// Gerar token JWT
try {
  const payload = {
    userId: adminId,
    phoneNumber: adminPhone,
    role: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dias
  };

  const token = jwt.sign(payload, jwtSecret);
  console.log('\nToken JWT gerado com sucesso:');
  console.log(token);

  // Verificar o token
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('\nToken verificado com sucesso:');
    console.log(JSON.stringify(decoded, null, 2));
  } catch (verifyError) {
    console.error('\nErro ao verificar token:', verifyError);
  }

  console.log('\nInstruções:');
  console.log('1. Copie o token acima');
  console.log('2. No navegador, abra o console do desenvolvedor (F12)');
  console.log('3. Execute: localStorage.setItem("token", "SEU_TOKEN_AQUI")');
  console.log('4. Recarregue a página');
} catch (error) {
  console.error('Erro ao gerar token JWT:', error);
}
