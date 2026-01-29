-- Fix module_key values in cards table
-- This script removes the 'cards.' prefix from module_key values that incorrectly have it
-- This will fix the duplicate shortcuts issue in the Add Shortcut modal

-- Update module_key values to remove 'cards.' prefix
UPDATE cards
SET module_key = REPLACE(module_key, 'cards.', '')
WHERE module_key LIKE 'cards.%';

-- Verify the changes
SELECT id, title, module_key, href, enabled
FROM cards
ORDER BY module_key;
