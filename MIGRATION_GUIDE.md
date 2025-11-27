# Guia de Execução da Migration: Remover notas_gerente

## Status
- ✅ Código atualizado
- ⏳ Migration pendente (executar manualmente)
- 📊 2 avaliações com notas_gerente (serão preservadas em backup)

## Como Executar a Migration

### Opção 1: Supabase Dashboard (RECOMENDADO)

1. **Acesse o Supabase Dashboard:**
   - URL: https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - Menu lateral: `SQL Editor`
   - Clique em `New Query`

3. **Cole o SQL:**
   - Abra o arquivo: `supabase/migrations/20251125_remove_notas_gerente.sql`
   - Copie todo o conteúdo
   - Cole no editor SQL

4. **Execute:**
   - Clique em `Run` ou pressione `Ctrl+Enter`
   - Aguarde a confirmação

5. **Verifique:**
   - Deve aparecer mensagem de sucesso
   - Verifique a tabela `avaliacoes_desempenho_backup_notas_gerente`

### Opção 2: Via psql (Se tiver acesso direto)

```bash
# Conectar ao banco
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Executar migration
\i supabase/migrations/20251125_remove_notas_gerente.sql
```

## O que a Migration Faz

### 1. Backup
Cria tabela `avaliacoes_desempenho_backup_notas_gerente` com:
- `id`: ID da avaliação
- `notas_gerente`: JSON com as notas (preservado para histórico)
- `updated_at`: Data da última atualização
- `backup_created_at`: Data do backup

### 2. Remoção
Remove a coluna `notas_gerente` da tabela `avaliacoes_desempenho`

### 3. Comentários
Adiciona comentários explicativos para documentação

## Após a Execução

### ✅ Sistema Atualizado
- Gerente NÃO atribui mais notas para Q11-Q14
- Gerente apenas visualiza respostas do colaborador
- Nota final calculada apenas com Q15-Q24
- Bug de visualização corrigido (comentários do gerente aparecem)

### 🔍 Verificação
Execute este comando SQL para verificar:

```sql
-- Verificar se a coluna foi removida
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'avaliacoes_desempenho'
AND column_name = 'notas_gerente';
-- Resultado esperado: 0 linhas

-- Verificar backup
SELECT COUNT(*) as total_backup
FROM avaliacoes_desempenho_backup_notas_gerente;
-- Resultado esperado: 2 registros
```

## Próximos Passos

1. ✅ Executar migration no Supabase Dashboard
2. ✅ Testar fluxo completo:
   - Colaborador preenche Q11-Q14
   - Gerente visualiza e preenche Q15-Q24
   - Verificar que comentários aparecem
   - Verificar cálculo de nota_final

## Rollback (Se Necessário)

Se precisar reverter a migration:

```sql
-- Restaurar coluna
ALTER TABLE avaliacoes_desempenho
ADD COLUMN notas_gerente JSONB;

-- Restaurar dados do backup
UPDATE avaliacoes_desempenho a
SET notas_gerente = b.notas_gerente
FROM avaliacoes_desempenho_backup_notas_gerente b
WHERE a.id = b.id;

-- Remover backup
DROP TABLE avaliacoes_desempenho_backup_notas_gerente;
```

## Suporte

Se encontrar problemas:
1. Verifique os logs no Supabase Dashboard
2. Execute o script de verificação: `node scripts/execute-remove-notas-gerente-direct.js`
3. Consulte a documentação do Supabase sobre migrations
