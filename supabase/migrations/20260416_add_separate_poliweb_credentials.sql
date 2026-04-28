-- Add separate credential fields for Poliweb Novo and Antigo
-- This allows users to have different credentials for each system

ALTER TABLE poliweb_credentials 
ADD COLUMN IF NOT EXISTS username_novo VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_novo VARCHAR(255),
ADD COLUMN IF NOT EXISTS username_antigo VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_antigo VARCHAR(255);

-- Migrate existing data to both fields (if old fields exist)
-- The existing username/password will be used for both systems initially
UPDATE poliweb_credentials 
SET 
    username_novo = username,
    password_novo = password,
    username_antigo = username,
    password_antigo = password
WHERE username_novo IS NULL AND password_novo IS NULL;

-- Create index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_poliweb_credentials_user_id ON poliweb_credentials(user_id);