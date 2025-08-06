// Gerar hash real da senha
const crypto = require('crypto');

// Simular bcrypt hash para a senha 'Caio@2122@'
const password = 'Caio@2122@';

// Gerar salt
const salt = '$2a$10$' + crypto.randomBytes(16).toString('base64').slice(0, 22).replace(/\+/g, '.').replace(/\//g, '.');

console.log('🔐 Informações para correção do usuário admin:');
console.log('==============================================');
console.log('');
console.log('📧 Email: ***REMOVED***');
console.log('🔑 Senha: Caio@2122@');
console.log('');

// Como não posso executar bcrypt diretamente, vou fornecer um hash válido conhecido
const knownHash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // Hash para 'password'

console.log('🔧 INSTRUÇÕES PARA CORRIGIR:');
console.log('');
console.log('1. Acesse o Supabase Dashboard');
console.log('2. Vá para SQL Editor');
console.log('3. Execute esta query para gerar o hash correto:');
console.log('');
console.log("SELECT crypt('Caio@2122@', gen_salt('bf', 10)) as password_hash;");
console.log('');
console.log('4. Copie o hash gerado e use na próxima query:');
console.log('');
console.log('UPDATE users_unified SET');
console.log("  password = '[HASH_GERADO_AQUI]',");
console.log("  password_hash = '[HASH_GERADO_AQUI]',");
console.log("  role = 'ADMIN',");
console.log('  active = true,');
console.log('  is_authorized = true,');
console.log("  authorization_status = 'active',");
console.log('  password_last_changed = NOW(),');
console.log('  updated_at = NOW()');
console.log("WHERE email = '***REMOVED***';");
console.log('');
console.log('5. Se o usuário não existir, execute primeiro:');
console.log('');
console.log('INSERT INTO users_unified (');
console.log('  email, phone_number, first_name, last_name,');
console.log('  password, password_hash, role, position, department,');
console.log('  active, is_authorized, authorization_status,');
console.log('  password_last_changed, created_at, updated_at');
console.log(') VALUES (');
console.log("  '***REMOVED***',");
console.log("  '+5522997847289',");
console.log("  'Caio',");
console.log("  'Correia',");
console.log("  '[HASH_GERADO_AQUI]',");
console.log("  '[HASH_GERADO_AQUI]',");
console.log("  'ADMIN',");
console.log("  'Administrador do Sistema',");
console.log("  'TI',");
console.log('  true,');
console.log('  true,');
console.log("  'active',");
console.log('  NOW(),');
console.log('  NOW(),');
console.log('  NOW()');
console.log(');');
console.log('');
console.log('✅ Depois de executar, teste o login com:');
console.log('📧 Email: ***REMOVED***');
console.log('🔑 Senha: Caio@2122@');
