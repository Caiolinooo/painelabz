# 🚀 PLANO COMPLETO DE IMPLEMENTAÇÃO - SISTEMA ABZ

## 📊 **STATUS ATUAL (2025-01-03)**

### ✅ **MELHORIAS JÁ IMPLEMENTADAS (5/9)**
- ✅ **Tema claro/escuro removido** - Sistema mais limpo
- ✅ **Nome do usuário no dashboard** - Saudação personalizada
- ✅ **Salvamento de configurações corrigido** - Admin funcional
- ✅ **Menu lateral recolhível** - Navegação otimizada
- ✅ **Botão de salvamento único no perfil** - UX melhorada

### 🔄 **MELHORIAS PENDENTES (4/9)**
- 🔍 **Busca indexada geral**
- 🎓 **ABZ Academy**
- 📱 **Sistema news estilo Instagram**
- 📅 **Integração Google Calendar**

---

## 🎯 **FUNCIONALIDADES RESTANTES - DETALHAMENTO**

### **1. 🔍 BUSCA INDEXADA GERAL**
**Prioridade:** Alta | **Tempo estimado:** 8 horas

#### **Funcionalidades:**
- Buscar em arquivos/documentos
- Buscar em postagens/notícias
- Buscar em cards do dashboard
- Buscar em usuários (admin)
- Buscar em configurações

#### **Implementação técnica:**
```sql
-- Criar índices de busca no Supabase
CREATE INDEX idx_documents_search ON documents USING gin(to_tsvector('portuguese', title || ' ' || content));
CREATE INDEX idx_news_search ON news USING gin(to_tsvector('portuguese', title || ' ' || content));
CREATE INDEX idx_users_search ON users_unified USING gin(to_tsvector('portuguese', first_name || ' ' || last_name || ' ' || email));
```

#### **Componente de busca:**
```typescript
// src/components/GlobalSearch.tsx
interface SearchResult {
  id: string;
  type: 'document' | 'news' | 'user' | 'card';
  title: string;
  content: string;
  url: string;
}
```

#### **API necessária:**
- `/api/search` - Endpoint principal de busca
- Suporte a filtros por tipo
- Paginação de resultados
- Ranking por relevância

---

### **2. 🎓 ABZ ACADEMY - CENTRO DE TREINAMENTO**
**Prioridade:** Média | **Tempo estimado:** 16 horas

#### **Fase 1 - Estrutura básica (4h):**
- Card no dashboard
- Página inicial `/academy`
- Navegação básica

#### **Fase 2 - Sistema de vídeos (8h):**
- Upload para Google Drive
- Player de vídeo integrado
- Categorias de cursos
- Progresso do usuário

#### **Fase 3 - EAD completo (4h):**
- Sistema de matrícula
- Certificados básicos
- Relatórios de progresso

#### **Banco de dados necessário:**
```sql
-- Tabelas para ABZ Academy
CREATE TABLE academy_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url VARCHAR(500),
  duration INTEGER, -- em minutos
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE academy_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_unified(id),
  course_id UUID REFERENCES academy_courses(id),
  progress INTEGER DEFAULT 0, -- 0-100%
  completed_at TIMESTAMP,
  enrolled_at TIMESTAMP DEFAULT NOW()
);
```

---

### **3. 📱 SISTEMA NEWS ESTILO INSTAGRAM**
**Prioridade:** Alta | **Tempo estimado:** 20 horas

#### **Funcionalidades principais:**
- Feed de postagens
- Sistema de likes
- Comentários aninhados
- Stories/Destaques
- Upload de imagens
- Hashtags e menções

#### **Banco de dados necessário:**
```sql
-- Sistema completo de posts
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_unified(id),
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  hashtags TEXT[],
  mentions UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE social_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_posts(id),
  user_id UUID REFERENCES users_unified(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES social_posts(id),
  user_id UUID REFERENCES users_unified(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES social_comments(id), -- Para comentários aninhados
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE social_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_unified(id),
  content TEXT,
  image_url VARCHAR(500),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Componentes necessários:**
- `SocialFeed.tsx` - Feed principal
- `PostCard.tsx` - Card de postagem
- `CommentSection.tsx` - Seção de comentários
- `StoryViewer.tsx` - Visualizador de stories
- `PostCreator.tsx` - Criador de posts

---

### **4. 📅 INTEGRAÇÃO GOOGLE CALENDAR**
**Prioridade:** Alta | **Tempo estimado:** 12 horas

#### **Funcionalidades:**
- Autenticação OAuth2 Google
- Sincronização bidirecional
- Notificações de eventos
- Interface de calendário
- Criação/edição de eventos

#### **APIs necessárias:**
```typescript
// Google Calendar API integration
interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  attendees: string[];
  location?: string;
}
```

#### **Configuração OAuth2:**
```javascript
// Google OAuth2 setup
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback';
```

#### **Endpoints necessários:**
- `/api/calendar/auth` - Autenticação Google
- `/api/calendar/events` - Listar eventos
- `/api/calendar/events/create` - Criar evento
- `/api/calendar/sync` - Sincronização
- `/api/calendar/notifications` - Webhook para notificações

---

## 🛠️ **ARQUIVOS PRINCIPAIS A SEREM CRIADOS/MODIFICADOS**

### **Para Busca Indexada:**
- `src/components/GlobalSearch.tsx`
- `src/components/SearchResults.tsx`
- `src/app/api/search/route.ts`
- `src/hooks/useSearch.ts`

### **Para ABZ Academy:**
- `src/app/academy/page.tsx`
- `src/components/Academy/CourseCard.tsx`
- `src/components/Academy/VideoPlayer.tsx`
- `src/app/api/academy/courses/route.ts`

### **Para Sistema Social:**
- `src/app/social/page.tsx`
- `src/components/Social/SocialFeed.tsx`
- `src/components/Social/PostCard.tsx`
- `src/app/api/social/posts/route.ts`

### **Para Google Calendar:**
- `src/app/calendar/page.tsx`
- `src/components/Calendar/CalendarView.tsx`
- `src/app/api/calendar/route.ts`
- `src/lib/googleCalendar.ts`

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

### **Preparação:**
- [ ] Verificar se todas as dependências estão instaladas
- [ ] Configurar variáveis de ambiente necessárias
- [ ] Criar tabelas no Supabase
- [ ] Configurar Google APIs (se necessário)

### **Busca Indexada:**
- [ ] Criar índices de busca no banco
- [ ] Implementar componente GlobalSearch
- [ ] Criar API de busca
- [ ] Integrar na interface principal
- [ ] Testar busca em diferentes tipos de conteúdo

### **ABZ Academy:**
- [ ] Criar estrutura de páginas
- [ ] Implementar upload de vídeos
- [ ] Sistema de progresso
- [ ] Interface de cursos
- [ ] Testes de funcionalidade

### **Sistema Social:**
- [ ] Criar tabelas do banco
- [ ] Implementar feed de posts
- [ ] Sistema de likes/comentários
- [ ] Upload de imagens
- [ ] Stories (opcional)

### **Google Calendar:**
- [ ] Configurar OAuth2
- [ ] Implementar sincronização
- [ ] Interface de calendário
- [ ] Sistema de notificações
- [ ] Testes de integração

---

## 🚨 **PONTOS DE ATENÇÃO**

### **Segurança:**
- Validar todas as entradas de usuário
- Implementar rate limiting nas APIs
- Verificar permissões de acesso
- Sanitizar uploads de arquivos

### **Performance:**
- Implementar paginação em listas
- Otimizar queries do banco
- Cache de resultados frequentes
- Lazy loading de componentes

### **UX/UI:**
- Manter consistência visual
- Feedback de loading
- Tratamento de erros
- Responsividade mobile

---

## 📞 **INFORMAÇÕES TÉCNICAS IMPORTANTES**

### **Banco de dados atual:**
- Supabase PostgreSQL
- URL: `https://arzvingdtnttiejcvucs.supabase.co`
- Tabelas principais: `users_unified`, `news`, `documents`

### **Autenticação:**
- Sistema próprio com JWT
- Contexto: `SupabaseAuthContext`
- Roles: ADMIN, USER, MANAGER

### **Estrutura do projeto:**
- Next.js 14 com App Router
- TypeScript
- Tailwind CSS
- Componentes em `src/components/`
- APIs em `src/app/api/`

### **Deploy:**
- Netlify: `https://painelabzgroup.netlify.app`
- Auto-deploy do GitHub
- Variáveis de ambiente configuradas

---

## 🎯 **ORDEM DE IMPLEMENTAÇÃO RECOMENDADA**

1. **Busca Indexada** (mais simples, alto impacto)
2. **Google Calendar** (funcionalidade crítica)
3. **ABZ Academy** (valor de negócio)
4. **Sistema Social** (mais complexo, implementar por último)

**Cada funcionalidade deve ser implementada, testada e commitada separadamente para manter a estabilidade do sistema.**

---

## 💾 **COMANDOS ÚTEIS PARA CONTINUAÇÃO**

### **Verificar status atual:**
```bash
git status
npm run build
npm run dev
```

### **Testar funcionalidades:**
```bash
# Testar build
npm run build

# Verificar tipos
npx tsc --noEmit

# Executar em desenvolvimento
npm run dev
```

### **Banco de dados:**
```sql
-- Verificar tabelas existentes
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Verificar estrutura de uma tabela
\d users_unified
```

---

## 🔗 **LINKS IMPORTANTES**

- **Repositório:** https://github.com/Caiolinooo/painelabz
- **Deploy:** https://painelabzgroup.netlify.app
- **Supabase:** https://arzvingdtnttiejcvucs.supabase.co
- **Documentação:** Arquivos MD no repositório

---

## 📝 **NOTAS FINAIS**

### **Contexto do projeto:**
- Sistema interno da ABZ Group
- Painel administrativo para funcionários
- Foco em produtividade e comunicação interna
- Interface em português/inglês

### **Usuário principal:**
- Email: ***REMOVED***
- Role: ADMIN
- Acesso completo ao sistema

### **Melhorias já implementadas com sucesso:**
1. ✅ Remoção do tema claro/escuro
2. ✅ Saudação personalizada no dashboard
3. ✅ Correção do salvamento de configurações
4. ✅ Menu lateral recolhível
5. ✅ Botão de salvamento único no perfil

### **Commit mais recente:**
- Hash: `9f76315`
- Mensagem: "feat: Implementar melhorias principais do sistema ABZ"
- Data: 2025-01-03

**🎯 O sistema está estável e pronto para as próximas implementações!**
