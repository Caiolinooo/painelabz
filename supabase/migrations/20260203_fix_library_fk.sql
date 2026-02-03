-- Fix library_items foreign key to reference users_unified instead of auth.users
-- This is necessary because some users might verify via custom auth and exist in users_unified
-- but not necessarily in auth.users (or the IDs might be used differently in the app context).

DO $$
BEGIN
    -- Drop the existing foreign key if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'library_items_created_by_fkey') THEN
        ALTER TABLE library_items DROP CONSTRAINT library_items_created_by_fkey;
    END IF;

    -- Add the new foreign key referencing users_unified
    ALTER TABLE library_items 
    ADD CONSTRAINT library_items_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES users_unified(id)
    ON DELETE SET NULL;

EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
