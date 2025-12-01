-- Migration: Create news_post_views table for real view tracking
-- This replaces the simple counter increment with session-based tracking

-- Create table for view tracking
CREATE TABLE IF NOT EXISTS news_post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES news_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_unified(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate views from same session on same day
  UNIQUE(post_id, session_id, DATE(viewed_at))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_news_post_views_post_id ON news_post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_news_post_views_session_id ON news_post_views(session_id);
CREATE INDEX IF NOT EXISTS idx_news_post_views_date ON news_post_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_news_post_views_user_id ON news_post_views(user_id) WHERE user_id IS NOT NULL;

-- Add comment
COMMENT ON TABLE news_post_views IS 'Tracks real post views using session-based identification to prevent inflation from page reloads';
COMMENT ON COLUMN news_post_views.session_id IS 'SHA-256 hash of IP + User-Agent to identify unique sessions anonymously';
COMMENT ON COLUMN news_post_views.viewed_at IS 'Timestamp of when the view occurred';

-- Enable RLS
ALTER TABLE news_post_views ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role has full access" ON news_post_views
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to view their own views
CREATE POLICY "Users can view their own views" ON news_post_views
  FOR SELECT
  USING (auth.uid() = user_id);

-- Migration successful message
DO $$ 
BEGIN 
  RAISE NOTICE 'news_post_views table created successfully with RLS policies';
END $$;
