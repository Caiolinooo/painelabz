# Changelog - Correções do Módulo de Notícias

**Data**: 2025-11-18
**Branch**: `claude/fix-news-photos-01G5myeNWqU3rX4rwVQRKW6V`

## Problemas Identificados

1. ❌ **Não conseguimos postar fotos**: O upload de fotos estava falhando silenciosamente
2. ❌ **As fotos não estão aparecendo**: URLs incorretas ou bucket não configurado
3. ❓ **Função de evento/destaque**: Status desconhecido

## Alterações Implementadas

### 1. API de Upload (`src/app/api/news/upload/route.ts`)

#### Melhorias:
- ✅ Adicionadas constantes de validação
  - Tamanho máximo: 50 MB
  - Tipos permitidos: JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime

- ✅ Validação de arquivos no servidor
  - Verifica tamanho antes do upload
  - Verifica tipo MIME permitido
  - Retorna erros detalhados

- ✅ Logs aprimorados
  - Logs de início de upload
  - Logs de sucesso com URL
  - Logs de erro com detalhes completos

- ✅ Mensagens de erro melhoradas
  - Erro específico por arquivo
  - Sugestão de solução
  - Link para documentação

#### Código Adicionado:
```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Validação de tamanho e tipo
for (const file of files) {
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({
      error: `Arquivo "${file.name}" excede o tamanho máximo de 50 MB`,
      details: `Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)} MB`
    }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({
      error: `Tipo de arquivo "${file.type}" não permitido`,
      details: 'Tipos permitidos: JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime',
      file: file.name
    }, { status: 400 });
  }
}
```

### 2. InstagramStylePostCreator (`src/components/news/InstagramStylePostCreator.tsx`)

#### Melhorias:
- ✅ Validação client-side antes do upload
  - Verifica tamanho do arquivo
  - Verifica tipo MIME
  - Alerta imediato ao usuário

- ✅ Tratamento de erros aprimorado
  - Captura erros do servidor
  - Exibe mensagens detalhadas
  - Logs no console para debugging

- ✅ Feedback visual
  - Logs de início de upload
  - Logs de sucesso
  - Mensagens de erro claras

#### Código Adicionado:
```typescript
// Validação de arquivos
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

// Validar arquivos
for (const file of files) {
  if (file.size > MAX_FILE_SIZE) {
    alert(`Arquivo "${file.name}" excede o tamanho máximo de 50 MB.\n\nTamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    return;
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    alert(`Tipo de arquivo não permitido: ${file.type}\n\nArquivo: ${file.name}\n\nTipos permitidos: JPEG, PNG, GIF, WebP, MP4, WebM`);
    return;
  }
}
```

### 3. HighlightCreator (`src/components/news/HighlightCreator.tsx`)

#### Melhorias:
- ✅ Mesmas validações do InstagramStylePostCreator
- ✅ Tratamento de erros com toast notifications
- ✅ Logs detalhados para debugging

### 4. EventCreator (`src/components/news/EventCreator.tsx`)

#### Status:
- ✅ **Funcional**: Não requer upload de fotos
- ✅ Cria eventos no calendário
- ✅ Publica post automático no feed
- ✅ Envia notificações por email
- ✅ Integração com API de calendário funcionando

### 5. Documentação

#### Novos Arquivos:
- ✅ `docs/NEWS_MODULE_SETUP.md`: Guia completo de configuração
  - Instruções para criar bucket no Supabase
  - Configuração de políticas RLS
  - Troubleshooting comum
  - Estrutura de pastas recomendada

- ✅ `scripts/setup-news-storage.js`: Script automatizado de setup
  - Verifica buckets existentes
  - Cria bucket 'news' se não existir
  - Testa upload e recuperação
  - Valida configuração

- ✅ `CHANGELOG_NEWS_MODULE.md`: Este arquivo

## Configuração Necessária do Supabase

⚠️ **AÇÃO REQUERIDA**: Para que o upload de fotos funcione, é necessário configurar o Supabase Storage:

### Passos Manuais:

1. **Criar Bucket 'news'**:
   - Acessar Supabase Dashboard > Storage
   - Criar bucket `news` como **público**
   - Configurar tamanho máximo: 50 MB
   - Tipos permitidos: image/*, video/*

2. **Configurar Políticas RLS**:

```sql
-- Leitura pública
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'news');

-- Upload autenticado
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'news' AND auth.role() = 'authenticated');

-- Atualização autenticada
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'news' AND auth.role() = 'authenticated');

-- Exclusão autenticada
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'news' AND auth.role() = 'authenticated');
```

3. **Executar Script de Teste** (opcional, quando houver conectividade):
```bash
node scripts/setup-news-storage.js
```

## Verificação Pós-Deploy

Após fazer deploy das alterações e configurar o Supabase:

1. ✅ Acessar o módulo de notícias
2. ✅ Criar um novo post com foto
3. ✅ Verificar se a imagem foi enviada (console logs)
4. ✅ Verificar se a imagem aparece no feed
5. ✅ Criar um destaque (highlight)
6. ✅ Criar um evento
7. ✅ Verificar URLs das imagens

## Estrutura de Pastas no Supabase Storage

```
/news
├── posts/        → Fotos de posts regulares
├── highlights/   → Fotos de destaques (stories)
├── events/       → Fotos de eventos (futuro)
└── test/         → Arquivos de teste
```

## Exemplo de URL Correta

```
https://arzvingdtnttiejcvucs.supabase.co/storage/v1/object/public/news/posts/abc-123-def.jpg
```

## Compatibilidade

- ✅ Next.js 15
- ✅ React 19
- ✅ Supabase Storage API
- ✅ TypeScript 5

## Breaking Changes

Nenhuma alteração quebra compatibilidade. Todas as mudanças são retrocompatíveis.

## Notas de Migração

1. Instalar dependências (se ainda não instaladas):
```bash
npm install
```

2. Configurar Supabase Storage conforme `docs/NEWS_MODULE_SETUP.md`

3. Testar upload de fotos

4. Verificar logs no console do navegador e servidor

## Suporte

Para problemas:
1. Verificar logs do navegador (F12 > Console)
2. Verificar logs do servidor Next.js
3. Consultar `docs/NEWS_MODULE_SETUP.md`
4. Verificar políticas RLS no Supabase Dashboard

## Autores

- **Claude Code**: Análise e correções
- **Data**: 2025-11-18

---

**Status**: ✅ Pronto para revisão e merge
