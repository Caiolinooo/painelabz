-- Add separate credentials for old Poliweb version
-- Allows using different credentials for novo (new) and antigo (old) versions

ALTER TABLE poliweb_credentials 
ADD COLUMN IF NOT EXISTS username_antigo VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_antigo VARCHAR(255);

COMMENT ON COLUMN poliweb_credentials.username IS 'Username for new Poliweb (poliweb.policlinicamacae.com.br)';
COMMENT ON COLUMN poliweb_credentials.password IS 'Password for new Poliweb (poliweb.policlinicamacae.com.br)';
COMMENT ON COLUMN poliweb_credentials.username_antigo IS 'Username for old Poliweb (policlinicaweb.com.br)';
COMMENT ON COLUMN poliweb_credentials.password_antigo IS 'Password for old Poliweb (policlinicaweb.com.br)';
