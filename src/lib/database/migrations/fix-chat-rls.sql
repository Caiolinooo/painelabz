-- Fix RLS for Chat Messages to allow Realtime to work
-- Run this in Supabase SQL Editor

-- First, check if RLS is enabled
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate)
DROP POLICY IF EXISTS "Users can view messages in their channels" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Chat messages are viewable by authenticated users" ON chat_messages;
DROP POLICY IF EXISTS "Chat messages insertable by authenticated" ON chat_messages;

-- OPTION 1: Allow all authenticated users to see all messages (simpler, less secure)
CREATE POLICY "Chat messages are viewable by authenticated users"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- OPTION 2: Allow authenticated users to insert messages
CREATE POLICY "Chat messages insertable by authenticated"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Allow updates for edit functionality
CREATE POLICY "Users can update own messages"
ON chat_messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid());

-- Allow delete (soft delete) for admins and message owners
CREATE POLICY "Users can delete own messages"
ON chat_messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Note: For Realtime to work with RLS, the SELECT policy must allow
-- the subscription to see the row. Using "USING (true)" allows all
-- authenticated users to receive realtime updates.

-- If you want more restrictive policies based on channel membership,
-- you need to ensure the channel permissions are properly set.
