# Análise e Recomendações para Tradução Completa do Sistema

## 📋 Resumo Executivo

Este documento identifica pontos onde a tradução não está sendo aplicada corretamente e fornece recomendações para garantir que **todos os elementos do sistema** (notificações, emails, botões, status, etc.) sejam completamente traduzíveis.

## 🔍 Pontos Críticos Identificados

### 1. **Notificações de Avaliação** (`src/lib/evaluation-notifications.ts`)

**Problema:** Strings hardcoded em português que não usam o sistema de i18n.

**Exemplos encontrados:**
```typescript
// ❌ INCORRETO - Hardcoded
title = '🚀 Novo Período de Avaliação';
message = `O período de avaliação "${periodName}" foi aberto!`;

// ✅ CORRETO - Usando i18n
import { getTranslation } from '@/i18n';
const locale = getUserLocale(); // Obter idioma do usuário
title = getTranslation(locale, 'notifications.evaluation.periodOpened.title');
message = getTranslation(locale, 'notifications.evaluation.periodOpened.message', { periodName });
```

### 2. **Templates de Email** (`src/lib/notifications.ts` e `src/lib/emailTemplates.ts`)

**Problema:** Templates de email com conteúdo fixo em português.

**Recomendação:**
- Criar templates dinâmicos que aceitem o idioma do usuário
- Usar chaves de tradução para assuntos e conteúdos de email

### 3. **Status e Labels**

**Problema:** Status de reembolso, avaliação e outros módulos podem ter labels hardcoded.

**Verificar em:**
- Componentes de status badge
- Dropdowns de seleção
- Tabelas e listas

## 🔧 Chaves de Tradução Faltantes

### Notificações de Avaliação

Adicionar ao `pt-BR.ts` e `en-US.ts`:

```typescript
notifications: {
  evaluation: {
    periodOpened: {
      title: 'Novo Período de Avaliação', // EN: 'New Evaluation Period'
      message: 'O período de avaliação "{periodName}" foi aberto! Acesse para iniciar sua autoavaliação.', // EN: 'The evaluation period "{periodName}" has been opened! Access to start your self-evaluation.'
    },
    evaluationCreated: {
      title: 'Nova Avaliação Disponível', // EN: 'New Evaluation Available'
      message: 'Uma nova avaliação de desempenho foi criada para o período: {periodName}. Acesse para iniciar sua autoavaliação.', // EN: 'A new performance evaluation has been created for the period: {periodName}. Access to start your self-evaluation.'
    },
    selfEvaluationCompleted: {
      title: 'Autoavaliação Concluída', // EN: 'Self-Evaluation Completed'
      message: '{employeeName} completou a autoavaliação e está aguardando sua revisão como gestor.', // EN: '{employeeName} completed the self-evaluation and is awaiting your review as manager.'
    },
    managerReviewPending: {
      title: 'Revisão Gerencial Pendente', // EN: 'Manager Review Pending'
      message: 'Você tem uma avaliação de {employeeName} aguardando sua revisão e aprovação.', // EN: 'You have an evaluation from {employeeName} awaiting your review and approval.'
    },
    evaluationReturned: {
      title: 'Avaliação Devolvida para Ajustes', // EN: 'Evaluation Returned for Adjustments'
      message: 'Sua avaliação foi devolvida pelo gestor {managerName} para ajustes. Verifique os comentários e reenvie.', // EN: 'Your evaluation was returned by manager {managerName} for adjustments. Check the comments and resubmit.'
    },
    evaluationRevised: {
      titleByEmployee: 'Comentário Final Adicionado', // EN: 'Final Comment Added'
      messageByEmployee: '{employeeName} adicionou o comentário final na avaliação. Revise e finalize a avaliação.', // EN: '{employeeName} added the final comment to the evaluation. Review and finalize the evaluation.'
      titleByManager: 'Avaliação Aprovada pelo Gerente', // EN: 'Evaluation Approved by Manager'
      messageByManager: '{managerName} aprovou sua avaliação. Adicione seu comentário final para concluir o processo.', // EN: '{managerName} approved your evaluation. Add your final comment to complete the process.'
    },
    evaluationCompleted: {
      title: 'Avaliação Finalizada', // EN: 'Evaluation Completed'
      message: 'Sua avaliação de desempenho foi finalizada por {managerName}! Visualize os resultados e feedback.', // EN: 'Your performance evaluation has been completed by {managerName}! View the results and feedback.'
    }
  },
  reimbursement: {
    submitted: {
      title: 'Reembolso Enviado', // EN: 'Reimbursement Submitted'
      message: 'Sua solicitação de reembolso (Protocolo: {protocol}) foi enviada com sucesso.', // EN: 'Your reimbursement request (Protocol: {protocol}) was submitted successfully.'
    },
    approved: {
      title: 'Reembolso Aprovado', // EN: 'Reimbursement Approved'
      message: 'Seu reembolso (Protocolo: {protocol}) foi aprovado! Valor: {amount}', // EN: 'Your reimbursement (Protocol: {protocol}) was approved! Amount: {amount}'
    },
    rejected: {
      title: 'Reembolso Rejeitado', // EN: 'Reimbursement Rejected'
      message: 'Seu reembolso (Protocolo: {protocol}) foi rejeitado. Motivo: {reason}', // EN: 'Your reimbursement (Protocol: {protocol}) was rejected. Reason: {reason}'
    }
  },
  system: {
    welcome: {
      title: 'Bem-vindo ao Sistema', // EN: 'Welcome to the System'
      message: 'Olá {name}! Seu acesso foi aprovado.', // EN: 'Hello {name}! Your access has been approved.'
    },
    passwordExpiry: {
      title: 'Senha Expirando', // EN: 'Password Expiring'
      message: 'Sua senha expira em {days} dias. Por favor, altere sua senha.', // EN: 'Your password expires in {days} days. Please change your password.'
    }
  }
}
```

### Templates de Email

```typescript
emailTemplates: {
  subjects: {
    accessApproved: 'Acesso Aprovado - ABZ Group', // EN: 'Access Approved - ABZ Group'
    accessRejected: 'Solicitação de Acesso Negada - ABZ Group', // EN: 'Access Request Denied - ABZ Group'
    inviteCode: 'Convite para ABZ Group', // EN: 'Invitation to ABZ Group'
    reimbursementSubmitted: 'Solicitação de Reembolso - Protocolo: {protocol}', // EN: 'Reimbursement Request - Protocol: {protocol}'
    reimbursementApproved: 'Reembolso Aprovado - Protocolo: {protocol}', // EN: 'Reimbursement Approved - Protocol: {protocol}'
    reimbursementRejected: 'Reembolso Não Aprovado - Protocolo: {protocol}', // EN: 'Reimbursement Not Approved - Protocol: {protocol}'
    welcome: 'Bem-vindo ao ABZ Group', // EN: 'Welcome to ABZ Group'
    passwordExpiry: 'Sua Senha Irá Expirar em Breve', // EN: 'Your Password Will Expire Soon'
  },
  greetings: {
    hello: 'Olá', // EN: 'Hello'
    dear: 'Prezado(a)', // EN: 'Dear'
  },
  closings: {
    regards: 'Atenciosamente', // EN: 'Best regards'
    team: 'Equipe ABZ Group', // EN: 'ABZ Group Team'
  },
  common: {
    viewDetails: 'Ver Detalhes', // EN: 'View Details'
    contactSupport: 'Entre em contato com o suporte', // EN: 'Contact support'
    automaticNotification: 'Esta é uma notificação automática do sistema.', // EN: 'This is an automatic system notification.'
  }
}
```

## 📝 Plano de Ação

### Fase 1: Atualizar Arquivos de Tradução ✅

1. **Adicionar chaves faltantes** aos arquivos:
   - `src/i18n/locales/pt-BR.ts`
   - `src/i18n/locales/en-US.ts`

### Fase 2: Refatorar Notificações

1. **Atualizar `evaluation-notifications.ts`:**
```typescript
// Importar sistema de tradução
import { getTranslation } from '@/i18n';

// Obter idioma do usuário (adicionar função helper)
async function getUserLocale(userId: string): Promise<'pt-BR' | 'en-US'> {
  const { supabaseAdmin } = await import('@/lib/supabase');
  const { data } = await supabaseAdmin
    .from('users_unified')
    .select('language')
    .eq('id', userId)
    .single();
  
  return data?.language || 'pt-BR';
}

// Usar nas notificações
export async function createEvaluationNotification(params: CreateEvaluationNotificationParams) {
  const locale = await getUserLocale(params.userId);
  
  let title = '';
  let message = '';
  
  switch (params.type) {
    case 'period_opened':
      title = getTranslation(locale, 'notifications.evaluation.periodOpened.title');
      message = getTranslation(locale, 'notifications.evaluation.periodOpened.message', {
        periodName: params.periodName
      });
      break;
    // ... outros casos
  }
}
```

### Fase 3: Refatorar Templates de Email

1. **Criar função helper para templates traduzíveis:**
```typescript
// src/lib/emailTemplates.ts
import { getTranslation } from '@/i18n';

export function getEmailTemplate(
  locale: 'pt-BR' | 'en-US',
  templateKey: string,
  variables: Record<string, string>
): { subject: string; html: string } {
  const subject = getTranslation(locale, `emailTemplates.subjects.${templateKey}`, variables);
  const greeting = getTranslation(locale, 'emailTemplates.greetings.hello');
  const closing = getTranslation(locale, 'emailTemplates.closings.regards');
  const team = getTranslation(locale, 'emailTemplates.closings.team');
  
  // Construir HTML do email com traduções
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${subject}</title>
    </head>
    <body>
      <p>${greeting} ${variables.name},</p>
      <!-- Conteúdo específico do template -->
      <p>${closing},<br>${team}</p>
    </body>
    </html>
  `;
  
  return { subject, html };
}
```

### Fase 4: Verificar Componentes UI

1. **Verificar e atualizar:**
   - Status badges (Pendente, Aprovado, Rejeitado, etc.)
   - Botões de ação
   - Labels de formulários
   - Mensagens de erro e sucesso
   - Tooltips e hints

2. **Exemplo de componente de status:**
```typescript
// ❌ ANTES
<span className="badge">{status === 'pending' ? 'Pendente' : 'Aprovado'}</span>

// ✅ DEPOIS
import { useI18n } from '@/contexts/I18nContext';

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <span className="badge">{t(`common.status.${status}`)}</span>;
}
```

## 🎯 Checklist de Verificação

### Notificações
- [ ] Títulos de notificação traduzíveis
- [ ] Mensagens de notificação traduzíveis
- [ ] Prioridades e tipos traduzíveis
- [ ] URLs de ação com contexto de idioma

### Emails
- [ ] Assuntos de email traduzíveis
- [ ] Corpo do email traduzível
- [ ] Saudações e despedidas traduzíveis
- [ ] Botões de ação traduzíveis
- [ ] Rodapés traduzíveis

### Interface do Usuário
- [ ] Botões (Salvar, Cancelar, Enviar, etc.)
- [ ] Labels de formulários
- [ ] Placeholders de inputs
- [ ] Mensagens de validação
- [ ] Tooltips e hints
- [ ] Breadcrumbs
- [ ] Títulos de páginas
- [ ] Descrições de cards

### Status e Estados
- [ ] Status de reembolso (Pendente, Aprovado, Rejeitado)
- [ ] Status de avaliação (Pendente, Em Progresso, Concluída)
- [ ] Status de usuário (Ativo, Inativo, Banido)
- [ ] Prioridades (Baixa, Normal, Alta, Urgente)

### Módulos Específicos
- [ ] Avaliação de Desempenho
- [ ] Reembolsos
- [ ] Academia
- [ ] Notícias
- [ ] Calendário
- [ ] Perfil de Usuário
- [ ] Administração

## 🛠️ Ferramentas e Helpers

### 1. Função para Interpolação de Variáveis

```typescript
// src/i18n/index.ts
export function getTranslation(
  locale: Locale,
  key: string,
  variables?: Record<string, string | number>
): string {
  let translation = getTranslationKey(locale, key);
  
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      translation = translation.replace(`{${key}}`, String(value));
    });
  }
  
  return translation;
}
```

### 2. Hook para Componentes React

```typescript
// src/hooks/useTranslation.ts
import { useI18n } from '@/contexts/I18nContext';
import { getTranslation } from '@/i18n';

export function useTranslation() {
  const { locale } = useI18n();
  
  const t = (key: string, variables?: Record<string, string | number>) => {
    return getTranslation(locale, key, variables);
  };
  
  return { t, locale };
}
```

### 3. Middleware para Emails

```typescript
// src/lib/email-i18n.ts
export async function sendTranslatedEmail(
  userId: string,
  templateKey: string,
  variables: Record<string, string>
) {
  const locale = await getUserLocale(userId);
  const { subject, html } = getEmailTemplate(locale, templateKey, variables);
  
  return sendEmail(userEmail, subject, '', html);
}
```

## 📊 Prioridades

### Alta Prioridade (Implementar Imediatamente)
1. ✅ Notificações de avaliação
2. ✅ Emails de reembolso
3. ✅ Status de reembolso e avaliação
4. ✅ Botões principais (Salvar, Cancelar, Enviar)

### Média Prioridade (Próxima Sprint)
1. Labels de formulários
2. Mensagens de validação
3. Tooltips e hints
4. Breadcrumbs

### Baixa Prioridade (Backlog)
1. Logs do sistema
2. Mensagens de debug
3. Comentários de código

## 🔄 Processo de Manutenção

### Para Novos Recursos

1. **Sempre usar chaves de tradução:**
   ```typescript
   // ❌ NÃO FAZER
   const message = "Operação realizada com sucesso";
   
   // ✅ FAZER
   const message = t('common.success.operationCompleted');
   ```

2. **Adicionar traduções em ambos os idiomas:**
   - Adicionar em `pt-BR.ts`
   - Adicionar em `en-US.ts`
   - Testar em ambos os idiomas

3. **Documentar novas chaves:**
   - Adicionar comentário explicativo
   - Incluir exemplo de uso
   - Listar variáveis aceitas

### Code Review Checklist

- [ ] Todas as strings visíveis ao usuário usam i18n?
- [ ] Traduções adicionadas em pt-BR e en-US?
- [ ] Variáveis de interpolação funcionando?
- [ ] Testado em ambos os idiomas?
- [ ] Documentação atualizada?

## 📚 Recursos Adicionais

### Documentação
- [Next.js i18n](https://nextjs.org/docs/advanced-features/i18n-routing)
- [React i18next](https://react.i18next.com/)

### Ferramentas
- [i18n Ally (VS Code Extension)](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)
- [Translation Manager](https://github.com/i18next/i18next-scanner)

## ✅ Conclusão

Este documento fornece um roteiro completo para garantir que **todos os pontos do sistema** sejam traduzíveis. Seguindo estas recomendações, o sistema terá:

- ✅ Notificações completamente traduzíveis
- ✅ Emails em múltiplos idiomas
- ✅ Interface de usuário totalmente internacionalizada
- ✅ Status e labels traduzíveis
- ✅ Processo de manutenção documentado

**Próximos Passos:**
1. Implementar chaves de tradução faltantes
2. Refatorar arquivos de notificação
3. Atualizar templates de email
4. Verificar e corrigir componentes UI
5. Testar em ambos os idiomas

---

**Última Atualização:** ${new Date().toLocaleDateString('pt-BR')}
**Responsável:** Equipe de Desenvolvimento ABZ
