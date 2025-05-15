# Solução para o Módulo de Avaliações

Este documento explica a solução implementada para corrigir o problema no módulo de avaliações, onde a lista de avaliações não estava sendo exibida devido a um erro relacionado à coluna `data_criacao`.

## Problema Identificado

O erro principal era:
```
{"code":"42703","details":null,"hint":null,"message":"column avaliacoes.data_criacao does not exist"}
```

Este erro ocorria porque o código estava tentando acessar a coluna `data_criacao` na tabela `avaliacoes`, mas essa coluna não existia no banco de dados.

## Soluções Implementadas

### 1. Código Resiliente para Consulta de Dados

Modificamos o código para ser mais resiliente, implementando uma estratégia de fallback em três níveis:

1. **Primeiro nível**: Tenta buscar dados da view `vw_avaliacoes_desempenho`
2. **Segundo nível**: Se falhar, tenta buscar diretamente da tabela `avaliacoes` com joins
3. **Terceiro nível**: Se ainda falhar, faz uma consulta simples e busca os dados de funcionários separadamente

### 2. Mapeamento de Dados Flexível

Atualizamos o mapeamento de dados para lidar com diferentes estruturas de resposta, verificando a existência de campos antes de acessá-los e fornecendo valores padrão quando necessário.

### 3. Scripts para Correção do Banco de Dados

Criamos vários scripts para verificar e corrigir a estrutura do banco de dados:

- **check-database.js**: Verifica a estrutura atual do banco de dados
- **run-fix-database.js**: Corrige a estrutura do banco de dados
- **insert-sample-data.js**: Insere dados de exemplo para teste
- **fix-database-complete.sql**: Script SQL completo para corrigir a estrutura da tabela

### 4. Tratamento de Erros Robusto

Implementamos um tratamento de erros mais robusto para fornecer informações detalhadas sobre problemas, facilitando a depuração.

## Como Aplicar a Solução

Para aplicar a solução completa, execute o script `fix-all.js`:

```bash
node scripts/fix-all.js
```

Este script irá:
1. Verificar o banco de dados
2. Corrigir a estrutura do banco de dados
3. Inserir dados de exemplo
4. Fornecer instruções para reiniciar o servidor

Alternativamente, você pode executar cada script individualmente:

```bash
# Verificar o banco de dados
node scripts/check-database.js

# Corrigir o banco de dados
node scripts/run-fix-database.js

# Inserir dados de exemplo
node scripts/insert-sample-data.js
```

## Estrutura da Tabela `avaliacoes`

A tabela `avaliacoes` deve ter a seguinte estrutura:

```sql
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID NOT NULL,
  avaliador_id UUID NOT NULL,
  periodo TEXT NOT NULL,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE DEFAULT (CURRENT_DATE + INTERVAL '3 months'),
  status TEXT NOT NULL DEFAULT 'pending',
  pontuacao_total FLOAT DEFAULT 0,
  observacoes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Relações com Outras Tabelas

A tabela `avaliacoes` tem relações com a tabela `funcionarios`:

- `funcionario_id`: Referencia o funcionário que está sendo avaliado
- `avaliador_id`: Referencia o funcionário que está realizando a avaliação

## Fluxo de Dados

1. Os dados são buscados da tabela `avaliacoes` ou da view `vw_avaliacoes_desempenho`
2. Os dados são mapeados para um formato padronizado
3. Os dados são filtrados com base no termo de pesquisa
4. Os dados são exibidos na interface do usuário

## Verificação

Após aplicar a solução, acesse a página de avaliações para verificar se o erro foi resolvido:

```
http://localhost:3000/avaliacao
```

Se ainda houver problemas, verifique o console do navegador e os logs do servidor para obter mais informações sobre o erro.

## Manutenção Futura

Para evitar problemas semelhantes no futuro:

1. Sempre verifique a existência de colunas antes de acessá-las
2. Implemente tratamento de erros robusto
3. Use valores padrão para campos que podem estar ausentes
4. Mantenha a documentação da estrutura do banco de dados atualizada
