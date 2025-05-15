/**
 * IMPORTANTE: Este arquivo deve ser usado apenas no servidor.
 * Não importe este arquivo diretamente em componentes do cliente.
 * Use src/lib/email-client.ts para componentes do cliente.
 */

// Usar Gmail para todos os ambientes (desenvolvimento e produção)
console.log('Usando Gmail para envio de emails em todos os ambientes');
console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log(`Host: ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`);
console.log(`Porta: ${process.env.EMAIL_PORT || '465'}`);
console.log(`Usuário: ${process.env.EMAIL_USER || '***REMOVED***'}`);
console.log(`Remetente: ${process.env.EMAIL_FROM || '***REMOVED***'}`);

// Exportar as funções do Gmail
export * from './email-gmail';
