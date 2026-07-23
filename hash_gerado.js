const bcrypt = require('bcryptjs');

const password = process.env.ADMIN_PASSWORD || '';
if (!password) {
  console.error('Defina ADMIN_PASSWORD no ambiente antes de executar este script.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

console.log('Hash da senha gerado:');
console.log(hash);

const isValid = bcrypt.compareSync(password, hash);
console.log('Hash válido:', isValid);

module.exports = { hash };
