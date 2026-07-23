const bcrypt = require('bcryptjs');

const password = ***REMOVED***;
if (!password) {
  console.error('Defina ADMIN_PASSWORD no ambiente antes de executar este script.');
  process.exit(1);
}

const hash = ***REMOVED*** 10);

console.log('Hash da senha gerado:');
console.log(hash);

const isValid = bcrypt.compareSync(password, hash);
console.log('Hash válido:', isValid);

module.exports = { hash };
