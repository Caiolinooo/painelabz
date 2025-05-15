/**
 * IMPORTANTE: Este arquivo deve ser usado apenas no servidor.
 * Não importe este arquivo diretamente em componentes do cliente.
 * Use src/lib/email-client.ts para componentes do cliente.
 */

// Escolher o provedor de email com base no ambiente
const isProduction = process.env.NODE_ENV === 'production';

// Log para debug
console.log(`Ambiente: ${isProduction ? 'produção' : 'desenvolvimento'}`);
console.log(`Configuração de email: ${isProduction ? 'Office 365/Exchange' : 'SendGrid'}`);
console.log(`Host: ${process.env.EMAIL_HOST}`);
console.log(`Porta: ${process.env.EMAIL_PORT}`);
console.log(`Usuário: ${process.env.EMAIL_USER}`);
console.log(`Remetente: ${process.env.EMAIL_FROM}`);

// Em produção, usar Office 365/Exchange
// Em desenvolvimento, usar SendGrid
export * from './email-exchange';
