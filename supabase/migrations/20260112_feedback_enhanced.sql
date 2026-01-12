-- Add additional columns for enhanced feedback (logs, screenshots, attachments)
-- Run this migration after 20260109_user_feedback.sql

-- Add console_logs column (JSONB for storing array of log objects)
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS console_logs JSONB DEFAULT '[]'::jsonb;

-- Add browser_info column (JSONB for browser details)
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS browser_info JSONB DEFAULT '{}'::jsonb;

-- Add screenshot_url column (URL to uploaded screenshot)
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add attachments column (JSONB array of attachment URLs)
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add user display info for faster queries
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);

-- Comment on columns
COMMENT ON COLUMN public.user_feedback.console_logs IS 'Array of console log entries (errors, warnings)';
COMMENT ON COLUMN public.user_feedback.browser_info IS 'Browser and system information';
COMMENT ON COLUMN public.user_feedback.screenshot_url IS 'URL to screenshot captured at submission';
COMMENT ON COLUMN public.user_feedback.attachments IS 'Array of user-uploaded attachment URLs';
