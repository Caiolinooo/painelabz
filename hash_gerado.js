const bcrypt = require('bcryptjs');

// Gerar hash da senha 'Caio@2122@'
const password = 'Caio@2122@';
const hash = ***REMOVED*** 10);

console.log('🔐 Hash da senha gerado:');
console.log(hash);

// Verificar se o hash está correto
const isValid = bcrypt.compareSync(password, hash);
console.log('✅ Hash válido:', isValid);

module.exports = { hash };
