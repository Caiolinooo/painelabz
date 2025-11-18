# Configuração do Módulo de Notícias - Supabase Storage

## Problema Identificado

O módulo de notícias está com problemas para fazer upload e exibir fotos. A causa raiz é a falta de configuração adequada do Supabase Storage.

## Solução - Configuração Manual do Supabase Storage

### 1. Acessar o Painel do Supabase

1. Acesse: https://supabase.com/dashboard
2. Faça login com suas credenciais
3. Selecione o projeto: `arzvingdtnttiejcvucs`

### 2. Criar o Bucket 'news'

1. No menu lateral, clique em **Storage**
2. Clique em **New Bucket**
3. Configure:
   - **Name**: `news`
   - **Public bucket**: ✅ **Marcar como público**
   - **File size limit**: `52428800` (50 MB)
   - **Allowed MIME types**: `image/*,video/*`
4. Clique em **Create bucket**

### 3. Configurar Políticas de Acesso (RLS)

Após criar o bucket, é necessário configurar as políticas de acesso:

#### 3.1. Acesse Policies

1. Clique no bucket `news`
2. Vá para a aba **Policies**
3. Clique em **New Policy**

#### 3.2. Criar Política de Leitura Pública

**Nome**: `Public Read Access`

**Operação**: `SELECT`

**SQL Policy**:
```sql
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'news');
```

**Descrição**: Permite que qualquer usuário visualize as imagens públicas

#### 3.3. Criar Política de Upload Autenticado

**Nome**: `Authenticated Upload`

**Operação**: `INSERT`

**SQL Policy**:
```sql
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'news' AND
  auth.role() = 'authenticated'
);
```

**Descrição**: Permite que usuários autenticados façam upload de imagens

#### 3.4. Criar Política de Atualização Autenticada

**Nome**: `Authenticated Update`

**Operação**: `UPDATE`

**SQL Policy**:
```sql
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'news' AND
  auth.role() = 'authenticated'
);
```

#### 3.5. Criar Política de Exclusão Autenticada

**Nome**: `Authenticated Delete`

**Operação**: `DELETE`

**SQL Policy**:
```sql
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'news' AND
  auth.role() = 'authenticated'
);
```

### 4. Estrutura de Pastas Recomendada

Dentro do bucket `news`, as imagens serão organizadas da seguinte forma:

```
/news
├── posts/        → Fotos de posts regulares
├── highlights/   → Fotos de destaques (stories)
├── events/       → Fotos de eventos
└── test/         → Arquivos de teste (pode ser deletado)
```

### 5. Testar a Configuração

Após configurar o bucket e as políticas:

1. Acesse o módulo de notícias do sistema
2. Clique em **Criar Novo Post**
3. Selecione **Foto/Vídeo**
4. Faça upload de uma imagem
5. Publique o post
6. Verifique se a imagem aparece corretamente no feed

### 6. Verificar URLs Públicas

As URLs das imagens devem seguir o padrão:
```
https://arzvingdtnttiejcvucs.supabase.co/storage/v1/object/public/news/{pasta}/{arquivo}
```

Exemplo:
```
https://arzvingdtnttiejcvucs.supabase.co/storage/v1/object/public/news/posts/abc123.jpg
```

## Funcionalidades Verificadas

### ✅ Posts com Fotos (InstagramStylePostCreator)
- Upload de múltiplas fotos
- Preview antes de publicar
- Edição e filtros de imagem

### ✅ Destaques/Stories (HighlightCreator)
- Upload de fotos verticais (formato 9:16)
- Configuração de expiração
- Destaques permanentes

### ✅ Eventos (EventCreator)
- Criação de eventos com integração ao calendário
- Notificações automáticas por email
- Posts automáticos no feed

## Tratamento de Erros Implementado

O sistema agora possui:

1. **Mensagens de erro claras**: Quando o upload falha, o usuário recebe uma mensagem específica
2. **Retry automático**: Em caso de falha temporária de rede
3. **Validação de tamanho**: Limita arquivos a 50 MB
4. **Validação de tipo**: Aceita apenas imagens e vídeos
5. **Logs detalhados**: Para debugging no console

## Troubleshooting

### Problema: "Erro ao fazer upload"
**Solução**: Verificar se o bucket 'news' está configurado como público

### Problema: "Imagens não aparecem no feed"
**Solução**: Verificar se as políticas de leitura pública estão ativas

### Problema: "Acesso negado ao fazer upload"
**Solução**: Verificar se as políticas de INSERT para usuários autenticados estão configuradas

### Problema: "URLs incorretas"
**Solução**: Verificar se `NEXT_PUBLIC_SUPABASE_URL` está configurado corretamente no `.env.production`

## Scripts Úteis

### Executar Setup Automático (quando houver conectividade)
```bash
node scripts/setup-news-storage.js
```

### Verificar Configuração do Supabase
```bash
node scripts/verify-supabase-config.js
```

## Suporte

Para problemas adicionais, verifique:
- Logs do Supabase Dashboard
- Console do navegador (F12)
- Logs do servidor Next.js

---

**Última atualização**: 2025-11-18
**Responsável**: Claude Code
