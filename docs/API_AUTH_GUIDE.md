# Guia de Autenticação de API

Este documento descreve o sistema de autenticação de API do Painel ABZ e como utilizá-lo corretamente.

## Visão Geral

O sistema de autenticação do Painel ABZ utiliza tokens JWT (JSON Web Tokens) para autenticar requisições à API. Cada requisição autenticada deve incluir um token válido no cabeçalho `Authorization`.

## Fluxo de Autenticação

1. O usuário faz login através da API `/api/auth/login`
2. O servidor valida as credenciais e gera um token JWT
3. O token é armazenado no localStorage do navegador com a chave `abzToken`
4. O token deve ser enviado em todas as requisições subsequentes no cabeçalho `Authorization`

## Enviando Requisições Autenticadas

Para enviar uma requisição autenticada, inclua o token JWT no cabeçalho `Authorization` com o prefixo `Bearer`:

```javascript
// Exemplo de requisição autenticada
const token = localStorage.getItem('abzToken');

if (!token) {
  throw new Error('Token não encontrado. Faça login novamente.');
}

const response = await fetch('/api/admin/resource', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Tratamento de Erros de Autenticação

Os seguintes códigos de erro podem ser retornados em caso de problemas de autenticação:

- **401 Unauthorized**: Token ausente ou inválido
- **403 Forbidden**: Token válido, mas o usuário não tem permissão para acessar o recurso

## Renovação de Token

Os tokens JWT têm validade de 7 dias. Após esse período, o usuário precisará fazer login novamente.

## Utilitários de Autenticação

O sistema fornece utilitários para facilitar a autenticação:

### No Frontend

```javascript
// Obter o token do localStorage
const token = localStorage.getItem('abzToken');

// Verificar se o token existe
if (!token) {
  // Redirecionar para a página de login
  window.location.href = '/login';
}

// Incluir o token em todas as requisições
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### No Backend

```typescript
import { verifyAuth } from '@/lib/api-utils';

// Em uma rota de API
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (segundo parâmetro true para exigir admin)
    const authResult = await verifyAuth(request, true);
    
    if (authResult.error) {
      return authResult.error;
    }
    
    const { user, payload } = authResult;
    
    // Continuar com a lógica da API...
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Boas Práticas

1. **Nunca armazene o token em variáveis globais** - Use sempre o localStorage
2. **Sempre verifique se o token existe antes de fazer requisições** - Forneça feedback claro ao usuário
3. **Inclua tratamento de erros para falhas de autenticação** - Redirecione para a página de login quando necessário
4. **Use o utilitário `verifyAuth` em todas as rotas protegidas** - Isso garante consistência no tratamento de autenticação

## Depuração de Problemas de Autenticação

Se estiver enfrentando problemas de autenticação:

1. Verifique se o token está sendo armazenado corretamente no localStorage
2. Verifique se o token está sendo incluído corretamente no cabeçalho `Authorization`
3. Verifique se o token não expirou (validade de 7 dias)
4. Verifique se o usuário tem as permissões necessárias para acessar o recurso
