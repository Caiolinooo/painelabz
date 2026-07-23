# 🔄 Workflow Completo de Avaliação de Desempenho

## 📋 Resumo das Correções Implementadas

### Problemas Identificados e Resolvidos

1. ✅ **Notificações por Email Implementadas**
   - Antes: Notificações eram criadas apenas no banco de dados
   - Agora: Todas as notificações são enviadas por email automaticamente

2. ✅ **API de Submissão de Avaliação**
   - Nova rota: `POST /api/avaliacao-desempenho/avaliacoes/[id]/submit`
   - Permite colaborador finalizar autoavaliação e enviar para revisão do gerente

3. ✅ **API de Aprovação de Avaliação**
   - Nova rota: `POST /api/avaliacao-desempenho/avaliacoes/[id]/approve`
   - Permite gerente aprovar avaliação com comentários

4. ✅ **API de Listagem de Avaliações Pendentes**
   - Nova rota: `GET /api/avaliacao-desempenho/avaliacoes/pending-review`
   - Lista todas as avaliações aguardando revisão do gerente

---

## 🔄 Fluxo Completo do Workflow

### 1️⃣ Criação da Avaliação (Admin/Gerente)
```
Status: pendente
- Admin ou gerente cria avaliação para um colaborador
- Colaborador recebe notificação push + email
```

### 2️⃣ Colaborador Preenche Autoavaliação
```
Status: pendente → em_andamento
- Colaborador acessa /avaliacao/preencher/[id]
- Preenche as questões de autoavaliação (Q11-Q14)
- Salva progresso (status permanece em_andamento)
```

### 3️⃣ Colaborador Submete para Revisão
```
Status: em_andamento → aguardando_aprovacao
- Colaborador clica em "Finalizar e Enviar para Revisão"
- Sistema chama: POST /api/avaliacao-desempenho/avaliacoes/[id]/submit
- Gerente recebe notificação push + email
```

### 4️⃣ Gerente Revisa e Aprova
```
Status: aguardando_aprovacao → concluida
- Gerente acessa /avaliacao/ver/[id]
- Revisa autoavaliação do colaborador
- Preenche avaliação do gerente (Q1-Q10, Q15)
- Clica em "Aprovar Avaliação"
- Sistema chama: POST /api/avaliacao-desempenho/avaliacoes/[id]/approve
- Colaborador recebe notificação push + email de aprovação
```

---

## 📧 Notificações por Email

### Tipos de Notificações Implementadas

1. **Autoavaliação Pendente**
   - Enviada quando: Avaliação é criada
   - Destinatário: Colaborador
   - Conteúdo: "Você tem uma autoavaliação pendente. Complete até [data]."

2. **Autoavaliação Recebida**
   - Enviada quando: Colaborador submete avaliação
   - Destinatário: Gerente
   - Conteúdo: "[Nome] completou sua autoavaliação e aguarda sua aprovação."

3. **Avaliação Aprovada**
   - Enviada quando: Gerente aprova avaliação
   - Destinatário: Colaborador
   - Conteúdo: "Sua avaliação foi aprovada por [Gerente]. Comentários: [texto]"

4. **Avaliação Editada**
   - Enviada quando: Gerente edita avaliação
   - Destinatário: Colaborador
   - Conteúdo: "Sua avaliação foi editada por [Gerente]."

---

## 🛠️ APIs Criadas/Modificadas

### 1. Submeter Avaliação
```typescript
POST /api/avaliacao-desempenho/avaliacoes/[id]/submit

Headers:
  Authorization: Bearer [token]

Response:
{
  "success": true,
  "message": "Avaliação submetida com sucesso para revisão do gerente",
  "data": {
    "id": "uuid",
    "status": "aguardando_aprovacao"
  }
}
```

### 2. Aprovar Avaliação
```typescript
POST /api/avaliacao-desempenho/avaliacoes/[id]/approve

Headers:
  Authorization: Bearer [token]

Body:
{
  "comentario_avaliador": "Excelente trabalho!"
}

Response:
{
  "success": true,
  "message": "Avaliação aprovada com sucesso",
  "data": {
    "id": "uuid",
    "status": "concluida"
  }
}
```

### 3. Listar Avaliações Pendentes
```typescript
GET /api/avaliacao-desempenho/avaliacoes/pending-review

Headers:
  Authorization: Bearer [token]

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "funcionario_nome": "João Silva",
      "periodo": "2025-Q1",
      "data_autoavaliacao": "2025-01-15T10:30:00Z",
      "status": "aguardando_aprovacao"
    }
  ],
  "count": 1
}
```

---

## 🔧 Modificações no Código

### 1. NotificacoesAvaliacaoService
**Arquivo:** `src/lib/services/notificacoes-avaliacao.ts`

**Mudanças:**
- ✅ Adicionado import do sistema de email
- ✅ Método `criarNotificacao` agora envia email automaticamente
- ✅ Novo método `enviarNotificacaoEmail` com template HTML

### 2. Novas Rotas de API
**Arquivos criados:**
- `src/app/api/avaliacao-desempenho/avaliacoes/[id]/submit/route.ts`
- `src/app/api/avaliacao-desempenho/avaliacoes/[id]/approve/route.ts`
- `src/app/api/avaliacao-desempenho/avaliacoes/pending-review/route.ts`

---

## 📊 Status da Avaliação

| Status | Descrição | Quem Pode Ver | Ações Disponíveis |
|--------|-----------|---------------|-------------------|
| `pendente` | Aguardando colaborador iniciar | Colaborador, Gerente, Admin | Iniciar preenchimento |
| `em_andamento` | Colaborador preenchendo | Colaborador, Gerente, Admin | Salvar, Submeter |
| `aguardando_aprovacao` | Aguardando revisão do gerente | Gerente, Admin | Aprovar, Devolver |
| `concluida` | Avaliação finalizada | Todos | Visualizar |
| `cancelada` | Avaliação cancelada | Admin | Reativar |

---

## 🎯 Como Usar (Frontend)

### Para o Colaborador

```typescript
// 1. Submeter avaliação após preencher
const submitEvaluation = async (avaliacaoId: string) => {
  const response = await fetch(
    `/api/avaliacao-desempenho/avaliacoes/${avaliacaoId}/submit`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const result = await response.json();
  if (result.success) {
    alert('Avaliação enviada para revisão do gerente!');
  }
};
```

### Para o Gerente

```typescript
// 1. Listar avaliações pendentes
const getPendingReviews = async () => {
  const response = await fetch(
    '/api/avaliacao-desempenho/avaliacoes/pending-review',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const result = await response.json();
  return result.data; // Array de avaliações pendentes
};

// 2. Aprovar avaliação
const approveEvaluation = async (avaliacaoId: string, comentario: string) => {
  const response = await fetch(
    `/api/avaliacao-desempenho/avaliacoes/${avaliacaoId}/approve`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: background-color:
        comentario_avaliador: comentario
      })
    }
  );
  
  const result = await response.json();
  if (result.success) {
    alert('Avaliação aprovada com sucesso!');
  }
};
```

---

## 🔍 Verificação do Workflow

### Checklist de Teste

- [ ] Colaborador recebe email ao criar avaliação
- [ ] Colaborador consegue preencher autoavaliação
- [ ] Colaborador consegue submeter avaliação
- [ ] Gerente recebe email quando colaborador submete
- [ ] Gerente vê avaliação na lista de pendentes
- [ ] Gerente consegue aprovar avaliação
- [ ] Colaborador recebe email de aprovação
- [ ] Status muda corretamente em cada etapa

---

## 📝 Próximos Passos Recomendados

1. **Interface do Gerente**
   - Criar página `/avaliacao/pendentes` para listar avaliações aguardando revisão
   - Adicionar badge de notificação no menu lateral

2. **Dashboard de Avaliações**
   - Adicionar card mostrando quantidade de avaliações pendentes
   - Gráfico de avaliações por status

3. **Relatórios**
   - Exportar avaliações em PDF
   - Histórico de avaliações do colaborador

4. **Melhorias**
   - Permitir gerente devolver avaliação para correção
   - Sistema de comentários entre gerente e colaborador
   - Notificações de prazo próximo ao vencimento

---

## 🐛 Troubleshooting

### Email não está sendo enviado
1. Verificar variáveis de ambiente:
   - `EMAIL_USER`
   - `EMAIL_PASSWORD`
   - `EMAIL_FROM`

2. Testar conexão SMTP:
   ```bash
   curl http://localhost:3000/api/test-email
   ```

### Notificação não aparece no banco
1. Verificar se a tabela `notifications` existe
2. Verificar logs do servidor para erros

### Gerente não recebe notificação
1. Verificar se o `avaliador_id` está correto na avaliação
2. Verificar se o gerente tem email cadastrado
3. Verificar logs da API de submit

---

## 📞 Suporte

Para dúvidas ou problemas, contate:
- **Desenvolvedor:** Caio Valerio Goulart Correia
- **Email:** caiovaleriogoulartcorreia@gmail.com

---

**Última atualização:** 2025-01-15
**Versão:** 1.1.0
