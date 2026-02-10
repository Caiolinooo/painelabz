-- Add validity_date column to epi_registrations table
ALTER TABLE epi_registrations
ADD COLUMN validity_date TIMESTAMP WITH TIME ZONE NULL;

-- Add comment
COMMENT ON COLUMN epi_registrations.validity_date IS 'Data de validade do EPI entregue';
