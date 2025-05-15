# Correção do Módulo de Avaliações

Este documento contém instruções para corrigir o problema com a coluna `data_criacao` na tabela `avaliacoes`.

## Problema Identificado

O erro ocorre porque o código está tentando acessar a coluna `data_criacao` na tabela `avaliacoes`, mas essa coluna não existe no banco de dados. O erro específico é:

```
{"code":"42703","details":null,"hint":null,"message":"column avaliacoes.data_criacao does not exist"}
```

## Solução

Existem duas abordagens para resolver este problema:

### Opção 1: Modificar o código para usar a coluna `created_at` (Recomendado)

Esta opção é mais simples e já foi implementada nos arquivos:
- `src\app\avaliacao\avaliacoes\page.tsx`
- `src\app\avaliacao\page.tsx`
- `src\app\avaliacao\nova\page.tsx`

As alterações incluem:
1. Mudar a ordenação de `data_criacao` para `created_at`
2. Atualizar o mapeamento de dados para usar `created_at` em vez de `data_criacao`
3. Atualizar a criação de novas avaliações para usar `created_at`

### Opção 2: Adicionar a coluna `data_criacao` à tabela `avaliacoes`

Se preferir manter a nomenclatura original, você pode adicionar a coluna `data_criacao` à tabela `avaliacoes` executando o script SQL fornecido.

## Passos para Aplicar a Correção

### Para a Opção 1 (Modificar o código):

1. As alterações já foram feitas nos arquivos mencionados acima.
2. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Para a Opção 2 (Adicionar a coluna ao banco de dados):

1. Acesse o painel do Supabase
2. Vá para a seção SQL Editor
3. Crie um novo script
4. Cole o conteúdo do arquivo `add-data-criacao-column.sql`
5. Execute o script
6. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Verificação Completa da Estrutura do Banco de Dados

Para uma solução mais completa que verifica e corrige toda a estrutura do banco de dados:

1. Acesse o painel do Supabase
2. Vá para a seção SQL Editor
3. Crie um novo script
4. Cole o conteúdo do arquivo `fix-avaliacoes-table.sql`
5. Execute o script
6. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

Este script irá:
- Criar as tabelas `avaliacoes` e `funcionarios` se não existirem
- Adicionar as colunas necessárias se estiverem faltando
- Criar a view `vw_avaliacoes_desempenho`
- Conceder as permissões necessárias

## Verificação

Após aplicar a correção, acesse a página de avaliações para verificar se o erro foi resolvido:

```
http://localhost:3000/avaliacao
```

Se ainda houver problemas, verifique o console do navegador e os logs do servidor para obter mais informações sobre o erro.
