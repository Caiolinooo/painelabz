/**
 * Script para verificar as variáveis de ambiente
 */

require('dotenv').config();

// Função para mascarar valores sensíveis
function maskValue(value, showChars = 4) {
  if (!value) return 'Não definido';
  if (value.length <= showChars * 2) return '********';
  return value.substring(0, showChars) + '********' + value.substring(value.length - showChars);
}

// Verificar variáveis do Supabase
console.log('=== Configurações do Supabase ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não definido');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', maskValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
console.log('SUPABASE_SERVICE_KEY:', maskValue(process.env.SUPABASE_SERVICE_KEY));

// Verificar variáveis do banco de dados
console.log('\n=== Configurações do Banco de Dados ===');
console.log('DATABASE_URL:', maskValue(process.env.DATABASE_URL));

// Verificar variáveis de JWT
console.log('\n=== Configurações de JWT ===');
console.log('JWT_SECRET:', maskValue(process.env.JWT_SECRET));

// Verificar variáveis do servidor
console.log('\n=== Configurações do Servidor ===');
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'Não definido');
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'Não definido');

// Verificar variáveis de email
console.log('\n=== Configurações de Email ===');
console.log('EMAIL_SERVER:', maskValue(process.env.EMAIL_SERVER));
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Não definido');
console.log('EMAIL_USER:', maskValue(process.env.EMAIL_USER));
console.log('EMAIL_PASSWORD:', maskValue(process.env.EMAIL_PASSWORD));
console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'Não definido');
console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'Não definido');
console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE || 'Não definido');

// Verificar variáveis de autenticação
console.log('\n=== Configurações de Autenticação ===');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'Não definido');
console.log('ADMIN_PHONE_NUMBER:', maskValue(process.env.ADMIN_PHONE_NUMBER));
console.log('ADMIN_PASSWORD:', maskValue(process.env.ADMIN_PASSWORD));
console.log('ADMIN_FIRST_NAME:', process.env.ADMIN_FIRST_NAME || 'Não definido');
console.log('ADMIN_LAST_NAME:', process.env.ADMIN_LAST_NAME || 'Não definido');
