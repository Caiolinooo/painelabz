// Script para gerar um token de teste
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Obter a chave secreta do JWT
const jwtSecret = process.env.JWT_SECRET || 'f033ca87f66377b65a90b4b510ff899fdb4c9bd1c5bc2b32731d97759c3815a8';

// Dados do usuário administrador
const adminId = 'c9b1e9a2-3c80-4b3d-9f75-fc7a00d7cdbb';
const adminEmail = process.env.ADMIN_EMAIL || 'caio.correia@groupabz.com';
const adminPhone = process.env.ADMIN_PHONE_NUMBER || '+5522997847289';

// Gerar token
function generateToken() {
  const payload = {
    userId: adminId,
    email: adminEmail,
    phoneNumber: adminPhone,
    role: 'ADMIN'
  };

  // Gerar token com validade de 7 dias
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

  console.log('Token gerado com sucesso:');
  console.log(token);

  // Verificar o token
  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('\nToken verificado com sucesso:');
    console.log(decoded);
  } catch (error) {
    console.error('\nErro ao verificar token:', error);
  }

  return token;
}

// Executar a função
const token = generateToken();
