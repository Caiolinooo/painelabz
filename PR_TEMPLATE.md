# Pull Request - Correção do Módulo de Notícias

## 🔗 Link para Criar PR

**Clique aqui para criar o Pull Request:**
https://github.com/Caiolinooo/EmployeeHub/pull/new/claude/fix-news-photos-01G5myeNWqU3rX4rwVQRKW6V

---

## 📋 Template da Descrição do PR

Copie e cole o conteúdo abaixo na descrição do Pull Request:

---

## 🎯 Objetivo

Corrigir problemas de upload e exibição de fotos no módulo de notícias do EmployeeHub.

## 🐛 Problemas Identificados

- ❌ Upload de fotos falhando silenciosamente
- ❌ Fotos não aparecendo no feed de notícias
- ❌ Falta de validação de arquivos (tamanho e tipo)
- ❌ Mensagens de erro genéricas e pouco informativas

## ✨ Alterações Implementadas

### 1. API de Upload (`/api/news/upload`)

- ✅ Validação de tamanho de arquivo (máximo 50 MB)
- ✅ Validação de tipo MIME (JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime)
- ✅ Logs aprimorados com emojis e detalhes
- ✅ Mensagens de erro detalhadas com sugestões de solução

### 2. InstagramStylePostCreator

- ✅ Validação client-side antes do upload
- ✅ Tratamento de erros aprimorado
- ✅ Feedback visual com logs detalhados
- ✅ Alertas informativos ao usuário

### 3. HighlightCreator (Destaques/Stories)

- ✅ Validação de arquivos com toast notifications
- ✅ Logs de debugging aprimorados
- ✅ Mensagens de erro claras

### 4. EventCreator

- ✅ Verificado e funcional (não usa upload de fotos)
- ✅ Integração com calendário OK
- ✅ Criação de posts automáticos OK

### 5. Documentação

- 📚 `docs/NEWS_MODULE_SETUP.md`: Guia completo de configuração
- 🔧 `scripts/setup-news-storage.js`: Script de configuração automatizada
- 📝 `CHANGELOG_NEWS_MODULE.md`: Resumo detalhado das alterações

## ⚙️ Configuração Necessária

⚠️ **IMPORTANTE**: Para que o upload de fotos funcione, é necessário configurar o Supabase Storage:

### 1. Criar Bucket 'news'
```
Dashboard > Storage > New Bucket
Nome: news
Público: ✅ Sim
Tamanho máximo: 50 MB
Tipos: image/*, video/*
```

### 2. Configurar Políticas RLS

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

### 3. Executar Script (Opcional)
```bash
node scripts/setup-news-storage.js
```

## 🧪 Como Testar

1. ✅ Acessar o módulo de notícias
2. ✅ Criar novo post com foto (botão "Foto/Vídeo")
3. ✅ Verificar logs no console do navegador
4. ✅ Verificar se a foto aparece no feed
5. ✅ Criar um destaque (Stories)
6. ✅ Criar um evento
7. ✅ Verificar URLs das imagens no Supabase

## 📁 Arquivos Modificados

- `src/app/api/news/upload/route.ts`
- `src/components/news/InstagramStylePostCreator.tsx`
- `src/components/news/HighlightCreator.tsx`
- `CHANGELOG_NEWS_MODULE.md` (novo)
- `docs/NEWS_MODULE_SETUP.md` (novo)
- `scripts/setup-news-storage.js` (novo)

## 🔍 Exemplo de URL Correta

```
https://arzvingdtnttiejcvucs.supabase.co/storage/v1/object/public/news/posts/abc-123.jpg
```

## 📊 Estrutura de Pastas no Storage

```
/news
├── posts/        → Fotos de posts regulares
├── highlights/   → Fotos de destaques (stories)
├── events/       → Fotos de eventos (futuro)
└── test/         → Arquivos de teste
```

## ⚡ Breaking Changes

Nenhuma alteração quebra compatibilidade. Todas as mudanças são retrocompatíveis.

## 📖 Documentação

Ver `docs/NEWS_MODULE_SETUP.md` para instruções completas de configuração.

## 🎯 Checklist de Aprovação

- [ ] Código revisado
- [ ] Bucket 'news' criado no Supabase
- [ ] Políticas RLS configuradas
- [ ] Upload de fotos testado
- [ ] Fotos aparecendo no feed
- [ ] Destaques funcionando
- [ ] Eventos funcionando

## 📝 Observações

Este PR resolve os problemas de upload e exibição de fotos no módulo de notícias. A configuração do Supabase Storage é **obrigatória** para que as funcionalidades funcionem corretamente.

---

**Status**: ✅ Pronto para revisão
**Prioridade**: Alta 🔴
**Estimativa de tempo de review**: 15-20 minutos
