-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_unified(id), -- Optional, can be anonymous? prefer linked
    type VARCHAR(20) NOT NULL CHECK (type IN ('doubt', 'bug', 'suggestion', 'other')),
    message TEXT NOT NULL,
    url VARCHAR(2048), -- URL where report happened
    user_agent TEXT,
    screen_resolution VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert feedback
CREATE POLICY "Authenticated users can create feedback" ON public.user_feedback FOR INSERT TO authenticated WITH CHECK (true);

-- Users can see their own feedback
CREATE POLICY "Users can see own feedback" ON public.user_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

-- Admins can see/edit all
CREATE POLICY "Admins can manage feedback" ON public.user_feedback FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users_unified WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER', 'SUPPORT'))
);
