-- Add last_active_at to users_unified (if it doesn't exist yet, we might need to alter the underlying table 'users' or 'profiles' depending on the view)
-- Assuming users_unified is a VIEW and the underlying table is 'profiles' or similar. 
-- Based on previous context, user data seems to be in 'users_unified' which might be a view over auth.users + public.profiles.
-- Let's try to add it to public.profiles if that's the standard, or just create a new tracking table if unsure.
-- For safety and simplicity given we can't see the exact DDL of users_unified easily:

-- 1. Create news_views table
CREATE TABLE IF NOT EXISTS public.news_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL, -- Logical link to news/news_posts/social_posts (foreign key removed to avoid migration errors with unknown table name)
    user_id UUID NOT NULL, -- We can't always reference auth.users directly if using database constraints easily without permissions, but logically it links there.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(news_id, user_id) -- Prevent duplicate view counts from same user on same news
);

-- Index for performance on counting
CREATE INDEX IF NOT EXISTS idx_news_views_news_id ON public.news_views(news_id);
CREATE INDEX IF NOT EXISTS idx_news_views_created_at ON public.news_views(created_at);

-- 2. Add columns for logical metrics if possible, or we create a metrics_events table
-- Let's stick to the plan: users_unified likely reads from a profiles table. 
-- We'll try to add last_active_at to valid user tables. 
-- If users_unified is complex, we can use a separate 'user_activity' table.
-- Plan B (Safer): user_activity table
CREATE TABLE IF NOT EXISTS public.user_activity (
    user_id UUID PRIMARY KEY,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Support FAQ / Noise Reduction Metrics Table
CREATE TABLE IF NOT EXISTS public.support_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    department VARCHAR(50) NOT NULL, -- 'RH', 'LOGISTICA', etc
    top_doubts JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of strings or objects { "doubt": "...", "count": 10 }
    volume_estimated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID
);

-- RLS Policies (Simplistic for now, assuming Admin access for these specific tables)
ALTER TABLE public.news_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_metrics ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to insert a view
CREATE POLICY "Authenticated users can insert view" ON public.news_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Everyone can read views count" ON public.news_views FOR SELECT TO authenticated USING (true);

-- Allow users to update their own activity
CREATE POLICY "Users can update own activity" ON public.user_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Admins can read all activity
CREATE POLICY "Admins can read all activity" ON public.user_activity FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users_unified WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);

-- Support Metrics: Admins/Managers only
CREATE POLICY "Admins manage support metrics" ON public.support_metrics FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users_unified WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
);
