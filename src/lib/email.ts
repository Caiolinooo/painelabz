/**
 * IMPORTANTE: Este arquivo deve ser usado apenas no servidor.
 * Não importe este arquivo diretamente em componentes do cliente.
 * Use src/lib/email-client.ts para componentes do cliente.
 */

// Usando SendGrid para envio de e-mails
// Para usar o SendGrid (recomendado para produção):
export * from './email-sendgrid';

// Para usar o Ethereal (apenas para testes), comente a linha do SendGrid acima e descomente a linha abaixo:
// export * from './email-ethereal';

// Para usar o Exchange, comente as linhas acima e descomente a linha abaixo:
// export * from './email-exchange';

// Para usar o Gmail, comente as linhas acima e descomente a linha abaixo:
// export * from './email-gmail';
