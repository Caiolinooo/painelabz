-- Migration: Fix notifications table schema - replace 'read' BOOLEAN with 'read_at' TIMESTAMP
-- Date: 2025-12-03
-- Purpose: Align database schema with application code expectations

-- Step 1: Add the new read_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN notifications.read_at IS 'Timestamp when the notification was read by the user';
  END IF;
END $$;

-- Step 2: Migrate existing data - set read_at based on old read column
DO $$ 
BEGIN
  -- If a notification was marked as read, set read_at to created_at as a reasonable default
  -- (we don't have the exact time it was read, so we use creation time)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'read'
  ) THEN
    UPDATE notifications 
    SET read_at = created_at 
    WHERE read = TRUE AND read_at IS NULL;
  END IF;
END $$;

-- Step 3: Drop the old read column and its index
DO $$ 
BEGIN
  -- Drop index first
  DROP INDEX IF EXISTS idx_notifications_read;
  
  -- Drop the old column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'read'
  ) THEN
    ALTER TABLE notifications DROP COLUMN read;
  END IF;
END $$;

-- Step 4: Create new index for read_at
CREATE INDEX IF NOT EXISTS idx_notifications_read_at 
ON notifications(read_at) 
WHERE read_at IS NULL;

-- Step 5: Create index for created_at if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

-- Step 6: Verify the action_url, priority, and expires_at columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'action_url'
  ) THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
    COMMENT ON COLUMN notifications.action_url IS 'URL to navigate when notification is clicked';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'normal' NOT NULL;
    COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high, urgent';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN notifications.expires_at IS 'Expiration date for the notification';
  END IF;
END $$;

-- Step 7: Add push_sent and email_sent columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'push_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN push_sent BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN notifications.push_sent IS 'Whether a push notification was sent';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'email_sent'
  ) THEN
    ALTER TABLE notifications ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN notifications.email_sent IS 'Whether an email notification was sent';
  END IF;
END $$;

-- Step 8: Create additional useful indexes
CREATE INDEX IF NOT EXISTS idx_notifications_priority 
ON notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notifications_expires_at 
ON notifications(expires_at) 
WHERE expires_at IS NOT NULL;

-- Update table comment
COMMENT ON TABLE notifications IS 'System-wide notifications table with read_at timestamp tracking';

-- Verification query (for debugging)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'notifications' 
-- ORDER BY ordinal_position;
