-- Create card_overrides table
CREATE TABLE IF NOT EXISTS public.card_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id TEXT NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE CASCADE,
    custom_label TEXT,
    custom_icon TEXT,
    enabled BOOLEAN,
    "order" INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(card_id, sector_id)
);

-- Add animation_config to cards table
-- Check if column exists first to be safe (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'animation_config') THEN
        ALTER TABLE public.cards ADD COLUMN animation_config JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.card_overrides ENABLE ROW LEVEL SECURITY;

-- Policies for card_overrides
-- Read: Authenticated users can read overrides (filtered by service logic usually, but open for now)
CREATE POLICY "Enable read access for authenticated users" ON public.card_overrides
    FOR SELECT
    TO authenticated
    USING (true);

-- Write: Only admins/managers can manage overrides (simplified to authenticated for existing admin patterns, usually handled by admin API)
CREATE POLICY "Enable write access for admins" ON public.card_overrides
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
