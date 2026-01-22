-- Direct Messaging Tables

-- DM Conversations (a conversation between 2+ users)
CREATE TABLE IF NOT EXISTS public.chat_dm_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- DM Participants
CREATE TABLE IF NOT EXISTS public.chat_dm_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_dm_conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users_unified(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_dm_participants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view DMs they participate in"
ON public.chat_dm_conversations FOR SELECT
USING (
    id IN (SELECT conversation_id FROM public.chat_dm_participants WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view participants in their DMs"
ON public.chat_dm_participants FOR SELECT
USING (
    conversation_id IN (SELECT conversation_id FROM public.chat_dm_participants WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert participants"
ON public.chat_dm_participants FOR INSERT
WITH CHECK (user_id = auth.uid() OR conversation_id IN (SELECT conversation_id FROM public.chat_dm_participants WHERE user_id = auth.uid()));

-- Add dm_conversation_id to chat_messages if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'dm_conversation_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN dm_conversation_id UUID REFERENCES public.chat_dm_conversations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add status column to users_unified if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users_unified' AND column_name = 'status') THEN
        ALTER TABLE public.users_unified ADD COLUMN status TEXT DEFAULT 'online';
    END IF;
END $$;

-- Index for faster DM queries
CREATE INDEX IF NOT EXISTS idx_dm_participants_user ON public.chat_dm_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_conversation ON public.chat_dm_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_dm ON public.chat_messages(dm_conversation_id);
