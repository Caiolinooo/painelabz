-- Upgrading notifications table for Social Network capabilities

-- 1. Add new columns if they don't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'system', -- 'like', 'comment', 'mention', 'alert', 'invite'
ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id), -- User who triggered the notification
ADD COLUMN IF NOT EXISTS resource_id text, -- ID of the related object (post_id, propery_id, etc)
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb, -- Flexible data (preview text, icon override)
ADD COLUMN IF NOT EXISTS link text; -- Action URL (unifying 'action_url' concepts)

-- 2. Add useful indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

-- 3. Comment on columns (Optional documentation)
COMMENT ON COLUMN notifications.type IS 'Type of notification: like, comment, mention, system, etc.';
COMMENT ON COLUMN notifications.actor_id IS 'The user who performed the action (e.g., who liked the post).';
