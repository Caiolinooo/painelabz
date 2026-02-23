-- Migration for Leave (Férias) Module

-- 1. Table for Sector Leave Hierarchy
CREATE TABLE IF NOT EXISTS public.leave_sector_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
    leader_id UUID REFERENCES public.users_unified(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES public.users_unified(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(sector_id)
);

-- Comments
COMMENT ON TABLE public.leave_sector_configs IS 'Configuration of approval hierarchy (Leader and Manager) for leave requests per sector';

-- 2. Table for Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users_unified(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING_LEADER', 'PENDING_MANAGER', 'APPROVED', 'REJECTED', 'CANCELLED')),
    justification TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comments
COMMENT ON TABLE public.leave_requests IS 'Leave (Férias) requests from employees';
COMMENT ON COLUMN public.leave_requests.status IS 'PENDING_LEADER, PENDING_MANAGER, APPROVED, REJECTED, CANCELLED';

-- Add RLS Policies

-- leave_sector_configs RLS
ALTER TABLE public.leave_sector_configs ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage leave_sector_configs"
    ON public.leave_sector_configs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_unified
            WHERE users_unified.id = auth.uid() AND users_unified.role = 'ADMIN'
        )
    );

-- Users can view configurations
CREATE POLICY "Anyone can view leave_sector_configs"
    ON public.leave_sector_configs
    FOR SELECT
    USING (true);


-- leave_requests RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own leave requests"
    ON public.leave_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create their own leave requests"
    ON public.leave_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests (e.g. to CANCELLED)
CREATE POLICY "Users can update their own leave requests"
    ON public.leave_requests
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Leaders and Managers can view requests of the sectors they manage
CREATE POLICY "Leaders and Managers can view leave requests of their sectors"
    ON public.leave_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.users_unified u
            JOIN public.leave_sector_configs lsc ON u.sector_id = lsc.sector_id
            WHERE u.id = leave_requests.user_id AND (lsc.leader_id = auth.uid() OR lsc.manager_id = auth.uid())
        )
    );

-- Leaders and Managers can update requests (to approve/reject)
CREATE POLICY "Leaders and Managers can update leave requests"
    ON public.leave_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.users_unified u
            JOIN public.leave_sector_configs lsc ON u.sector_id = lsc.sector_id
            WHERE u.id = leave_requests.user_id AND (lsc.leader_id = auth.uid() OR lsc.manager_id = auth.uid())
        )
    );

-- Admins can view and update everything
CREATE POLICY "Admins can view and update all leave requests"
    ON public.leave_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_unified
            WHERE users_unified.id = auth.uid() AND users_unified.role = 'ADMIN'
        )
    );

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leave_sector_configs_modtime
    BEFORE UPDATE ON public.leave_sector_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_leave_requests_modtime
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
