# Checklist de Teste: Sistema de Avaliação Atualizado

## ✅ Pré-requisitos
- [ ] Migration executada no Supabase Dashboard
- [ ] Servidor de desenvolvimento rodando (`npm run dev`)
- [ ] Usuário teste (colaborador) criado
- [ ] Usuário teste (gerente) criado

---

## 📋 Teste 1: Autoavaliação do Colaborador

### Login como Colaborador
1. [ ] Acessar `/login`
2. [ ] Fazer login com usuário colaborador
3. [ ] Navegar para módulo de Avaliações

### Preencher Autoavaliação
4. [ ] Abrir avaliação pendente
5. [ ] Preencher **Q11: Pontos Fortes** (apenas texto)
6. [ ] Preencher **Q12: Áreas de Melhoria** (apenas texto)
7. [ ] Preencher **Q13: Objetivos Alcançados** (apenas texto)
8. [ ] Preencher **Q14: Planos de Desenvolvimento** (apenas texto)
9. [ ] **Verificar:** NÃO deve aparecer opção de dar notas
10. [ ] Clicar em "Enviar Autoavaliação"

### Validações
- [ ] Status mudou para `aguardando_aprovacao`
- [ ] Notificação enviada para o gerente
- [ ] Respostas salvas no banco (campo `respostas`)

---

## 📋 Teste 2: Avaliação do Gerente

### Login como Gerente
11. [ ] Logout do colaborador
12. [ ] Login com usuário gerente
13. [ ] Navegar para módulo de Avaliações
14. [ ] Abrir avaliação com status `aguardando_aprovacao`

### Visualizar Respostas do Colaborador
15. [ ] **Verificar:** Q11-Q14 aparecem em modo leitura
16. [ ] **Verificar:** NÃO aparecem campos de notas para Q11-Q14
17. [ ] **Verificar:** Apenas visualização de texto

### Preencher Avaliação Gerencial
18. [ ] Preencher **Q15: Prazos e Metas** (nota 1-5 + comentário)
19. [ ] Preencher **Q16: Comprometimento** (nota 1-5 + comentário)
20. [ ] Preencher **Q17: Autonomia** (nota 1-5 + comentário)
21. [ ] Preencher **Q18: Comunicação** (nota 1-5 + comentário)
22. [ ] Preencher **Q19: Conhecimento** (nota 1-5 + comentário)
23. [ ] Preencher **Q20: Resolução** (nota 1-5 + comentário)
24. [ ] Preencher **Q21: Inteligência Emocional** (nota 1-5 + comentário)
25. [ ] Preencher **Q22: Inovação** (nota 1-5 + comentário)
26. [ ] Se líder: Preencher **Q23: Delegação** e **Q24: Feedback**
27. [ ] Clicar em "Aprovar e Finalizar"

### Validações
- [ ] Status mudou para `aprovada_aguardando_comentario`
- [ ] Respostas Q15-Q24 salvas no banco (campo `respostas`)
- [ ] Notificação enviada para o colaborador
- [ ] **IMPORTANTE:** Comentários do gerente salvos corretamente

---

## 📋 Teste 3: Comentário Final do Colaborador

### Login como Colaborador
28. [ ] Login novamente como colaborador
29. [ ] Abrir avaliação aprovada
30. [ ] **Verificar:** Todas as respostas do gerente aparecem (Q15-Q24)
31. [ ] **Verificar:** Notas e comentários do gerente visíveis
32. [ ] Adicionar comentário final do colaborador
33. [ ] Enviar comentário

### Validações
- [ ] Status mudou para `aguardando_finalizacao`
- [ ] Comentário final salvo no banco
- [ ] Notificação enviada para o gerente

---

## 📋 Teste 4: Finalização pelo Gerente

### Login como Gerente
34. [ ] Login como gerente
35. [ ] Abrir avaliação com status `aguardando_finalizacao`
36. [ ] **Verificar:** Todos os dados aparecem:
   - [ ] Q11-Q14 (respostas do colaborador)
   - [ ] Q15-Q24 (avaliação do gerente)
   - [ ] Comentário final do colaborador
37. [ ] Clicar em "Finalizar Avaliação"

### Validações
- [ ] Status mudou para `concluida`
- [ ] `nota_final` calculada e salva
- [ ] **Verificar cálculo:** nota_final = média apenas de Q15-Q24
- [ ] Notificação enviada para o colaborador

---

## 📋 Teste 5: Visualização Final

### Ver Avaliação Concluída
38. [ ] Abrir avaliação finalizada em modo visualização
39. [ ] **Verificar todos os dados aparecem:**
   - [ ] ✅ Respostas do colaborador (Q11-Q14)
   - [ ] ✅ Respostas do gerente (Q15-Q24) com notas
   - [ ] ✅ Comentários do gerente aparecem
   - [ ] ✅ Comentário final do colaborador
   - [ ] ✅ Nota final exibida
40. [ ] Exportar para PDF
41. [ ] **Verificar PDF:** Todos os dados aparecem corretamente

---

## 🔍 Verificações no Banco de Dados

Execute estas queries no Supabase SQL Editor:

```sql
-- 1. Verificar se coluna notas_gerente foi removida
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'avaliacoes_desempenho'
AND column_name = 'notas_gerente';
-- Esperado: 0 linhas

-- 2. Verificar backup
SELECT COUNT(*) as total_backup
FROM avaliacoes_desempenho_backup_notas_gerente;
-- Esperado: 2 registros

-- 3. Verificar avaliação teste
SELECT
  id,
  status,
  nota_final,
  respostas,
  comentario_avaliador
FROM avaliacoes_desempenho
WHERE id = 'ID_DA_AVALIACAO_TESTE';
-- Verificar se respostas contém Q15-Q24 com notas e comentários

-- 4. Calcular nota_final manualmente
SELECT
  id,
  nota_final,
  (
    SELECT AVG((value->>'nota')::numeric)
    FROM jsonb_each(respostas)
    WHERE value->>'nota' IS NOT NULL
    AND value->>'nota' != 'null'
    AND (value->>'nota')::numeric > 0
  ) as nota_calculada
FROM avaliacoes_desempenho
WHERE status = 'concluida'
AND id = 'ID_DA_AVALIACAO_TESTE';
-- nota_final deve ser igual a nota_calculada
```

---

## 🐛 Bugs Corrigidos

1. ✅ **Comentários do gerente agora aparecem**
   - Causa: Respostas não eram enviadas no POST /approve
   - Solução: Endpoint /approve agora salva respostas completas

2. ✅ **Gerente não avalia Q11-Q14**
   - Removido StarRating da interface
   - Apenas visualização de texto

3. ✅ **Nota final apenas com Q15-Q24**
   - Removida lógica de notas_gerente
   - Cálculo simplificado

---

## ⚠️ Notas Importantes

- **Avaliações antigas:** As 2 avaliações com notas_gerente terão seus dados preservados em backup
- **Novas avaliações:** Usarão o novo sistema sem notas para Q11-Q14
- **Compatibilidade:** Código preparado para funcionar sem a coluna notas_gerente

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador (F12)
2. Verifique os logs da API no terminal do servidor
3. Execute verificações SQL acima
4. Consulte `MIGRATION_GUIDE.md` para rollback se necessário
