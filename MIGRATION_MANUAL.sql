-- Migration: Fix notifications table schema
-- Replace 'read' BOOLEAN with 'read_at' TIMESTAMP

-- Step 1: Add read_at column if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Migrate existing data
-- If notification was marked as read, set read_at to created_at
UPDATE notifications 
SET read_at = created_at 
WHERE read = TRUE AND read_at IS NULL;

-- Step 3: Drop old 'read' column
ALTER TABLE notifications 
DROP COLUMN IF EXISTS read;

-- Step 4: Add other required columns if missing
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' NOT NULL;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_read_at 
ON notifications(read_at) WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_priority 
ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notifications_expires_at 
ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;