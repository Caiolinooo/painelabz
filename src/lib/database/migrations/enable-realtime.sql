-- Enable Supabase Realtime for Chat Tables
-- Run this in Supabase SQL Editor to enable real-time updates

-- Enable Realtime on chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable Realtime on chat_user_presence table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_user_presence;

-- Enable Realtime on users_unified for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE users_unified;

-- Note: You may also need to enable Realtime in the Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Under "supabase_realtime" publication, add the tables above
-- 3. Or use the Tables tab to enable "Realtime" toggle for each table

-- Create RLS policies to allow SELECT for chat_messages
-- This is required for Realtime to work with RLS enabled

-- Allow authenticated users to see messages in channels they have access to
CREATE POLICY IF NOT EXISTS "Users can view messages in their channels"
ON chat_messages FOR SELECT
USING (
    channel_id IN (
        SELECT id FROM chat_channels WHERE 
            (permissions->'isPublic')::boolean = true
            OR permissions->'members' ? auth.uid()::text
            OR permissions->'viewers' ? auth.uid()::text
    )
);

-- Allow authenticated users to insert messages
CREATE POLICY IF NOT EXISTS "Users can insert messages in their channels"
ON chat_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND channel_id IN (
        SELECT id FROM chat_channels WHERE 
            (permissions->'isPublic')::boolean = true
            OR permissions->'members' ? auth.uid()::text
    )
);
