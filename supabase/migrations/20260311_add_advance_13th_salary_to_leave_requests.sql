ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS advance_13th_salary BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN leave_requests.advance_13th_salary IS 'Indica se o colaborador deseja antecipar a 1ª parcela do 13º junto com as férias.';