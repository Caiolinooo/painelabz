-- Migration to add pecuniary allowance (abono pecuniário) to leave requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS pecuniary_allowance BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.leave_requests.pecuniary_allowance IS 'Indicates if the user requested to sell 10 days of their vacation (abono pecuniário)';
