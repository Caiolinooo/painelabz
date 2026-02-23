-- Migration to update Leave Module to support split periods
-- We are modifying the existing public.leave_requests table to use a JSONB 'periods' array
-- instead of simple start_date and end_date columns.
-- However, we'll keep start_date and end_date as the bounds of the ENTIRE vacation period
-- for easier querying of "when is this person away?". The 'periods' column will store the specific splits.

ALTER TABLE public.leave_requests
ADD COLUMN IF NOT EXISTS periods JSONB DEFAULT '[]'::jsonb;

-- Example structure for periods:
-- [
--   { "start_date": "2026-03-01", "end_date": "2026-03-15", "duration": 15 },
--   { "start_date": "2026-09-01", "end_date": "2026-09-15", "duration": 15 }
-- ]

-- Add Comment
COMMENT ON COLUMN public.leave_requests.periods IS 'Array of specific vacation periods (e.g. split into 2 or 3 parts)';
