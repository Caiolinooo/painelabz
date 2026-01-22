-- Create Chat Servers table
CREATE TABLE IF NOT EXISTS public.chat_servers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT, -- URL for the server icon/avatar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.users_unified(id) ON DELETE SET NULL, -- Owner
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for chat_servers
ALTER TABLE public.chat_servers ENABLE ROW LEVEL SECURITY;

-- Policies for chat_servers
CREATE POLICY "Servers are viewable by members (and public ones by everyone)" 
ON public.chat_servers FOR SELECT 
USING (
    is_public = true 
    OR 
    auth.uid() IN (SELECT user_id FROM public.chat_server_members WHERE server_id = id)
);

CREATE POLICY "Users can create servers" 
ON public.chat_servers FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their servers" 
ON public.chat_servers FOR UPDATE 
USING (auth.uid() = created_by);

-- Create Chat Server Members table
CREATE TABLE IF NOT EXISTS public.chat_server_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    server_id UUID REFERENCES public.chat_servers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users_unified(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member', -- owner, admin, moderator, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(server_id, user_id)
);

-- Enable RLS for chat_server_members
ALTER TABLE public.chat_server_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view other members in the same server" 
ON public.chat_server_members FOR SELECT 
USING (
    auth.uid() IN (
        SELECT user_id FROM public.chat_server_members AS csm WHERE csm.server_id = chat_server_members.server_id
    )
);

-- Add server_id to chat_channels
-- If chat_channels already exists, we modify it.
-- We also need to handle the 'type' column if it has a constraint.

DO $$ 
BEGIN 
    -- Add server_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channels' AND column_name = 'server_id') THEN
        ALTER TABLE public.chat_channels ADD COLUMN server_id UUID REFERENCES public.chat_servers(id) ON DELETE CASCADE;
    END IF;

    -- Update type check constraint if necessary 
    -- Since we can't easily modify a check constraint created implicitly by some tools, 
    -- we will try to drop the constraint if it acts on 'type' and replace it, or just assume it is text.
    -- For safety, we drop any check constraint named 'chat_channels_type_check' if it exists.
    
    -- Assuming 'type' is a text column. We want to ensure 'voice' is allowed.
    -- If it's an enum type, we would need to alter the type.
    -- Here we assume it is TEXT because the previous code showed string literals.
    -- We can add a check constraint for valid types if we want new validation.
    
    ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_type_check;
    ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_type_check 
    CHECK (type IN ('public', 'private', 'direct', 'department', 'project', 'voice', 'group', 'announcement'));

END $$;
