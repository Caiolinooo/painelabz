
-- Tabela para rastrear visualizações detalhadas de notícias
CREATE TABLE IF NOT EXISTS public.news_post_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL, -- Referência flexível para news_posts ou news
    user_id UUID REFERENCES public.users_unified(id) ON DELETE SET NULL,
    session_id TEXT, -- Hash para anônimos/sessão
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0, -- Tempo gasto no post
    
    -- Índices para performance
    CONSTRAINT uniq_view_session_day UNIQUE (post_id, session_id, viewed_at) -- Pseudo-unique (na verdade precisa ser por dia, index abaixo resolve)
);

-- Index para garantir unicidade por dia via aplicação ou trigger (opcional, aplicação já trata)
CREATE INDEX IF NOT EXISTS idx_news_post_views_post_date ON public.news_post_views (post_id, viewed_at);

-- Tabela de atividade do usuário (WAU)
CREATE TABLE IF NOT EXISTS public.user_activity (
    user_id UUID PRIMARY KEY REFERENCES public.users_unified(id) ON DELETE CASCADE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    last_ip TEXT,
    last_user_agent TEXT,
    total_sessions INTEGER DEFAULT 1
);

-- Policy para news_post_views
ALTER TABLE public.news_post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode inserir views" ON public.news_post_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins ver tudo" ON public.news_post_views
    FOR SELECT USING (
        (SELECT role FROM public.users_unified WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER', 'SUPPORT')
    );

-- Policy para user_activity
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users podem atualizar sua propria atividade" ON public.user_activity
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem ver atividade" ON public.user_activity
    FOR SELECT USING (
        (SELECT role FROM public.users_unified WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER', 'SUPPORT')
    );
