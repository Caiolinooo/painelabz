// Gerar hash a partir de ADMIN_PASSWORD (nunca hardcode senhas neste arquivo)
const crypto = require('crypto');

const password = process.env.ADMIN_PASSWORD || '';
if (!password) {
  console.error('Defina ADMIN_PASSWORD no ambiente antes de executar este script.');
  process.exit(1);
}

const salt = '$2a$10$' + crypto.randomBytes(16).toString('base64').slice(0, 22).replace(/\+/g, '.').replace(/\//g, '.');

console.log('Informações para correção do usuário admin:');
console.log('Email alvo: defina ADMIN_EMAIL no ambiente');
console.log('Salt gerado (exemplo):', salt);
console.log('');
console.log('No Supabase SQL Editor, execute:');
console.log("SELECT crypt(current_setting('app.admin_password'), gen_salt('bf', 10)) as password_hash;");
console.log('(Passe a senha via variável de sessão segura — não cole senhas em scripts versionados.)');
