# Guia de Implementação - Tradução Completa

## 🚀 Como Implementar Traduções no Sistema

Este guia fornece exemplos práticos de como implementar traduções em diferentes partes do sistema.

## 📁 Estrutura de Arquivos

```
src/
├── i18n/
│   ├── locales/
│   │   ├── pt-BR.ts  ✅ Atualizado com novas chaves
│   │   └── en-US.ts  ✅ Atualizado com novas chaves
│   ├── index.ts
│   └── config.ts
├── lib/
│   └── i18n-helpers.ts  ✅ NOVO - Funções utilitárias
└── ...
```

## 1. Notificações de Avaliação

### ❌ ANTES (Hardcoded)

```typescript
// src/lib/evaluation-notifications.ts
export async function createEvaluationNotification(params) {
  let title = '';
  let message = '';
  
  switch (params.type) {
    case 'period_opened':
      title = '🚀 Novo Período de Avaliação';
      message = `O período de avaliação "${params.periodName}" foi aberto!`;
      break;
  }
  
  // ... criar notificação
}
```

### ✅ DEPOIS (Traduzível)

```typescript
// src/lib/evaluation-notifications.ts
import { getEvaluationNotificationTranslation } from './i18n-helpers';

export async function createEvaluationNotification(params) {
  // Obter tradução baseada no idioma do usuário
  const { title, message } = await getEvaluationNotificationTranslation(
    params.userId,
    params.type,
    {
      periodName: params.periodName,
      employeeName: params.employeeName,
      managerName: params.managerName
    }
  );
  
  // Criar notificação com texto traduzido
  const notificationData = {
    user_id: params.userId,
    type: 'evaluation',
    title,
    message,
    // ... resto dos dados
  };
  
  await supabaseAdmin.from('notifications').insert(notificationData);
}
```

## 2. Emails de Reembolso

### ❌ ANTES (Hardcoded)

```typescript
// src/lib/notifications.ts
export async function sendReimbursementConfirmationEmail(
  email: string,
  nome: string,
  protocolo: string,
  valor: string
) {
  const emailContent = `
    <h2>Confirmação de Solicitação de Reembolso</h2>
    <p>Olá ${nome},</p>
    <p>Sua solicitação de reembolso foi recebida com sucesso.</p>
    <p>Protocolo: ${protocolo}</p>
    <p>Valor: ${valor}</p>
  `;
  
  await sendEmail(
    email,
    `Solicitação de Reembolso - Protocolo: ${protocolo}`,
    '',
    emailContent
  );
}
```

### ✅ DEPOIS (Traduzível)

```typescript
// src/lib/notifications.ts
import { 
  getUserLocale, 
  getEmailTemplate, 
  generateTranslatedEmailHTML,
  t 
} from './i18n-helpers';

export async function sendReimbursementConfirmationEmail(
  userId: string,
  email: string,
  nome: string,
  protocolo: string,
  valor: string
) {
  // Obter idioma do usuário
  const locale = await getUserLocale(userId);
  
  // Obter template traduzido
  const { subject, greeting, closing, team } = await getEmailTemplate(
    userId,
    'reimbursementSubmitted',
    { protocol: protocolo }
  );
  
  // Obter traduções específicas
  const intro = t(locale, 'emailTemplates.reimbursement.confirmation.intro');
  const protocolLabel = t(locale, 'emailTemplates.reimbursement.confirmation.protocolLabel');
  const valueLabel = t(locale, 'emailTemplates.reimbursement.confirmation.valueLabel');
  const statusLabel = t(locale, 'emailTemplates.reimbursement.confirmation.statusLabel');
  const statusPending = t(locale, 'emailTemplates.reimbursement.confirmation.statusPending');
  const footer = t(locale, 'emailTemplates.reimbursement.confirmation.footer');
  const viewDetails = t(locale, 'emailTemplates.common.viewDetails');
  
  // Construir conteúdo
  const content = `
    <p>${greeting} ${nome},</p>
    <p>${intro}</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>${protocolLabel}:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${protocolo}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>${valueLabel}:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${valor}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;"><strong>${statusLabel}:</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${statusPending}</td>
      </tr>
    </table>
    <p>${footer}</p>
    <p>${closing},<br>${team}</p>
  `;
  
  // Gerar HTML completo
  const html = await generateTranslatedEmailHTML(
    userId,
    subject,
    content,
    `${process.env.NEXT_PUBLIC_APP_URL}/reembolso/${protocolo}`,
    viewDetails
  );
  
  // Enviar email
  await sendEmail(email, subject, '', html);
}
```

## 3. Componentes React

### ❌ ANTES (Hardcoded)

```typescript
// src/components/StatusBadge.tsx
export function StatusBadge({ status }: { status: string }) {
  const statusText = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado'
  }[status] || status;
  
  return <span className="badge">{statusText}</span>;
}
```

### ✅ DEPOIS (Traduzível)

```typescript
// src/components/StatusBadge.tsx
import { useI18n } from '@/contexts/I18nContext';

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  
  return (
    <span className="badge">
      {t(`reimbursement.status.${status}`)}
    </span>
  );
}
```

## 4. Botões e Ações

### ❌ ANTES (Hardcoded)

```typescript
<button onClick={handleSave}>Salvar</button>
<button onClick={handleCancel}>Cancelar</button>
<button onClick={handleSubmit}>Enviar</button>
```

### ✅ DEPOIS (Traduzível)

```typescript
import { useI18n } from '@/contexts/I18nContext';

function MyComponent() {
  const { t } = useI18n();
  
  return (
    <>
      <button onClick={handleSave}>{t('common.save')}</button>
      <button onClick={handleCancel}>{t('common.cancel')}</button>
      <button onClick={handleSubmit}>{t('common.submit')}</button>
    </>
  );
}
```

## 5. Mensagens de Toast/Notificação

### ❌ ANTES (Hardcoded)

```typescript
toast.success('Operação realizada com sucesso!');
toast.error('Erro ao processar solicitação');
```

### ✅ DEPOIS (Traduzível)

```typescript
import { useI18n } from '@/contexts/I18nContext';

function MyComponent() {
  const { t } = useI18n();
  
  const handleSuccess = () => {
    toast.success(t('common.success'));
  };
  
  const handleError = () => {
    toast.error(t('common.error'));
  };
}
```

## 6. Formulários

### ❌ ANTES (Hardcoded)

```typescript
<form>
  <label>Nome Completo</label>
  <input placeholder="Digite seu nome" />
  
  <label>Email</label>
  <input placeholder="seu@email.com" />
  
  <button type="submit">Enviar</button>
</form>
```

### ✅ DEPOIS (Traduzível)

```typescript
import { useI18n } from '@/contexts/I18nContext';

function MyForm() {
  const { t } = useI18n();
  
  return (
    <form>
      <label>{t('profile.firstName')}</label>
      <input placeholder={t('register.firstNamePlaceholder')} />
      
      <label>{t('profile.email')}</label>
      <input placeholder={t('register.emailPlaceholder')} />
      
      <button type="submit">{t('common.submit')}</button>
    </form>
  );
}
```

## 7. Validações de Formulário

### ❌ ANTES (Hardcoded)

```typescript
if (!email) {
  return { error: 'Email é obrigatório' };
}

if (!isValidEmail(email)) {
  return { error: 'Email inválido' };
}
```

### ✅ DEPOIS (Traduzível)

```typescript
import { useI18n } from '@/contexts/I18nContext';

function validateForm(data: FormData) {
  const { t } = useI18n();
  
  if (!data.email) {
    return { error: t('common.required') };
  }
  
  if (!isValidEmail(data.email)) {
    return { error: t('common.invalidEmail') };
  }
  
  return { success: true };
}
```

## 8. Tabelas e Listas

### ❌ ANTES (Hardcoded)

```typescript
<table>
  <thead>
    <tr>
      <th>Nome</th>
      <th>Email</th>
      <th>Status</th>
      <th>Ações</th>
    </tr>
  </thead>
  <tbody>
    {/* ... */}
  </tbody>
</table>
```

### ✅ DEPOIS (Traduzível)

```typescript
import { useI18n } from '@/contexts/I18nContext';

function UserTable() {
  const { t } = useI18n();
  
  return (
    <table>
      <thead>
        <tr>
          <th>{t('profile.firstName')}</th>
          <th>{t('profile.email')}</th>
          <th>{t('common.status')}</th>
          <th>{t('common.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {/* ... */}
      </tbody>
    </table>
  );
}
```

## 9. Datas e Números

### Formatação de Datas

```typescript
import { useI18n } from '@/contexts/I18nContext';

function DateDisplay({ date }: { date: Date }) {
  const { locale } = useI18n();
  
  const formattedDate = date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return <span>{formattedDate}</span>;
}
```

### Formatação de Moeda

```typescript
import { useI18n } from '@/contexts/I18nContext';

function CurrencyDisplay({ amount }: { amount: number }) {
  const { locale } = useI18n();
  
  const formattedAmount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD'
  }).format(amount);
  
  return <span>{formattedAmount}</span>;
}
```

## 10. Páginas de Erro

### ❌ ANTES (Hardcoded)

```typescript
// src/app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Página não encontrada</h1>
      <p>A página que você está procurando não existe.</p>
      <Link href="/">Voltar para o início</Link>
    </div>
  );
}
```

### ✅ DEPOIS (Traduzível)

```typescript
// src/app/not-found.tsx
'use client';
import { useI18n } from '@/contexts/I18nContext';
import Link from 'next/link';

export default function NotFound() {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('errors.pageNotFound')}</h1>
      <p>{t('errors.pageNotFoundMessage')}</p>
      <Link href="/">{t('common.backToDashboard')}</Link>
    </div>
  );
}
```

## 📋 Checklist de Implementação

Ao adicionar uma nova funcionalidade, verifique:

- [ ] Todas as strings visíveis ao usuário usam `t()` ou `getTranslation()`
- [ ] Chaves de tradução adicionadas em `pt-BR.ts`
- [ ] Chaves de tradução adicionadas em `en-US.ts`
- [ ] Notificações usam `getEvaluationNotificationTranslation()` ou similar
- [ ] Emails usam `getEmailTemplate()` e `generateTranslatedEmailHTML()`
- [ ] Status e labels usam chaves de tradução
- [ ] Botões usam chaves de tradução
- [ ] Mensagens de validação usam chaves de tradução
- [ ] Datas formatadas com `toLocaleDateString(locale)`
- [ ] Moedas formatadas com `Intl.NumberFormat(locale)`
- [ ] Testado em ambos os idiomas (pt-BR e en-US)

## 🧪 Como Testar

### 1. Testar Mudança de Idioma

```typescript
// No navegador, abra o console e execute:
localStorage.setItem('language', 'en-US');
window.location.reload();

// Para voltar ao português:
localStorage.setItem('language', 'pt-BR');
window.location.reload();
```

### 2. Testar Notificações

```typescript
// Criar notificação de teste
const { title, message } = await getEvaluationNotificationTranslation(
  userId,
  'period_opened',
  { periodName: 'Test Period' }
);

console.log('Title:', title);
console.log('Message:', message);
```

### 3. Testar Emails

```typescript
// Gerar preview de email
const html = await generateTranslatedEmailHTML(
  userId,
  'Test Subject',
  '<p>Test content</p>',
  'https://example.com',
  'Click Here'
);

console.log(html);
```

## 🔧 Troubleshooting

### Problema: Tradução não aparece

**Solução:**
1. Verificar se a chave existe em ambos os arquivos de tradução
2. Verificar se o idioma do usuário está correto
3. Limpar cache do navegador
4. Verificar console para erros

### Problema: Variáveis não são interpoladas

**Solução:**
1. Verificar se as variáveis estão sendo passadas corretamente
2. Verificar se os nomes das variáveis correspondem aos placeholders `{variableName}`
3. Usar a função `t()` do helper que faz interpolação automática

### Problema: Email em idioma errado

**Solução:**
1. Verificar se `getUserLocale()` está retornando o idioma correto
2. Verificar se o usuário tem o campo `language` preenchido no banco
3. Verificar se o idioma é suportado ('pt-BR' ou 'en-US')

## 📚 Recursos Adicionais

- [Documentação do i18n](./TRANSLATION_ANALYSIS.md)
- [Arquivo de helpers](./src/lib/i18n-helpers.ts)
- [Contexto de i18n](./src/contexts/I18nContext.tsx)

---

**Última Atualização:** ${new Date().toLocaleDateString('pt-BR')}
**Responsável:** Equipe de Desenvolvimento ABZ
