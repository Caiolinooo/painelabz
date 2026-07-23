# 🚀 Como Executar a Migration do Módulo de Avaliação

## ⚠️ Problemas Comuns

### Erro de Foreign Keys (MAIS COMUM)
Se você está vendo este erro:
```
Could not find a relationship between 'avaliacoes_desempenho' and 'funcionarios'
```

**🎯 Solução Rápida**:
1. No painel de admin, vá para: **Admin → Avaliação → Banco de Dados**
2. Clique em **"Verificar Foreign Keys"**
3. Se mostrar que faltam foreign keys, abra o arquivo:
   - `supabase/migrations/FIX_FOREIGN_KEYS.sql`
4. Copie o conteúdo do **PASSO 2**
5. Execute no Supabase SQL Editor
6. Pronto! Recarregue a página

### Outros Erros
- "Tabelas não encontradas: periodos_avaliacao"
- Erro 400 ao carregar gerentes/líderes
- "Migration Não Executada"

## ✅ Solução: Executar a Migration Completa no Supabase

### Passo 1: Copiar o SQL da Migration

1. Acesse o painel de admin no sistema
2. Vá para: **Admin → Avaliação → Banco de Dados**
3. Clique no botão **"Executar Migration"**
4. O sistema irá mostrar uma mensagem: "Migration preparada!"
5. Clique no botão **"Copiar SQL"**

### Passo 2: Executar no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com
2. Selecione o seu projeto
3. No menu lateral, clique em **"SQL Editor"**
4. Clique em **"New query"** (Nova consulta)
5. Cole o SQL que você copiou
6. Clique em **"Run"** (ou pressione `Ctrl+Enter`)

### Passo 3: Verificar o Resultado

Você deverá ver uma mensagem de sucesso. A migration irá criar:

- ✅ Tabela `periodos_avaliacao`
- ✅ Campos `is_gerente_avaliacao` e `is_lider` na tabela `funcionarios`
- ✅ Campos de workflow em `avaliacoes_desempenho`
- ✅ Índices otimizados
- ✅ Políticas de segurança (RLS)

### Passo 4: Voltar ao Sistema

1. Volte para o painel de admin
2. Clique em **"Tentar Novamente"** ou recarregue a página
3. As funcionalidades agora devem estar disponíveis!

## 📋 O que a Migration Faz?

### 1. Tabela `periodos_avaliacao`
Gerencia os períodos de avaliação:
- Nome e descrição do período
- Datas de início e fim
- Data limite para autoavaliação
- Data limite para aprovação
- Status (ativo/inativo)

### 2. Novos Campos em `funcionarios`
- `is_gerente_avaliacao`: Marca quem pode aprovar avaliações
- `is_lider`: Marca quem deve responder critérios de liderança

### 3. Workflow em `avaliacoes_desempenho`
- `comentario_avaliador`: Comentário do gerente (Q15)
- `status_aprovacao`: Status do fluxo (pendente/aprovado/rejeitado)
- `data_autoavaliacao`: Quando foi preenchida
- `data_aprovacao`: Quando foi aprovada
- `aprovado_por`: Quem aprovou

### 4. Foreign Keys (Relacionamentos) 🔗
- `avaliacoes_desempenho_funcionario_id_fkey`: Relaciona avaliação com o funcionário avaliado
- `avaliacoes_desempenho_avaliador_id_fkey`: Relaciona avaliação com o avaliador
- **Importante**: Estas foreign keys permitem que queries façam joins entre tabelas

## 🔧 Problemas Comuns

### Erro: "column already exists"
- **Não é um problema!** Significa que alguns campos já existem
- A migration usa `IF NOT EXISTS` para evitar duplicação
- Continue com o resto da migration

### Erro: "relation does not exist"
- Verifique se as tabelas `funcionarios` e `avaliacoes_desempenho` existem
- Se não existirem, você precisará criá-las primeiro

### Erro de Permissão
- Certifique-se de estar logado como proprietário do projeto no Supabase
- Ou use o Service Role Key no backend

### Erro: "Could not find a relationship between tables"
- Este erro ocorre quando as foreign keys não existem
- **Solução**: Execute a migration completa que inclui as foreign keys
- As foreign keys são criadas no passo 3.1 da migration

## 🆘 Precisa de Ajuda?

1. Verifique os logs do Supabase para detalhes do erro
2. Consulte o guia completo em: `/docs/AVALIACAO_MIGRATION_GUIDE.md`
3. Entre em contato com o administrador do sistema

## 📝 Arquivos Importantes

- **SQL da Migration**: `/supabase/migrations/20251110_avaliacao_desempenho_migration.sql`
- **Guia Completo**: `/docs/AVALIACAO_MIGRATION_GUIDE.md`
- **Função execute_sql (opcional)**: `/supabase/migrations/00000_optional_execute_sql_function.sql`

---

**Última atualização**: 2025-11-10
