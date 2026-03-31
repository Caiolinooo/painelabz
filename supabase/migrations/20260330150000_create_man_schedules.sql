CREATE TABLE IF NOT EXISTS public.man_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vessel TEXT,
    full_name TEXT NOT NULL,
    position TEXT,
    original_start_date TIMESTAMP WITH TIME ZONE,
    date_of_birth TIMESTAMP WITH TIME ZONE,
    status TEXT,
    next_crew_change_date TIMESTAMP WITH TIME ZONE,
    email TEXT,
    phone TEXT,
    wish_to_transfer TEXT,
    est_transfer_date TEXT,
    rotation_details TEXT,
    location TEXT,
    rates TEXT,
    osm_thome_status TEXT,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.man_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" 
ON public.man_schedules FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for authenticated users" 
ON public.man_schedules FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" 
ON public.man_schedules FOR UPDATE 
TO authenticated 
USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" 
ON public.man_schedules FOR DELETE 
TO authenticated 
USING (true);
