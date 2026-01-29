# Database Fix for Duplicate Shortcuts

## Problem
The `cards` table in Supabase has incorrect `module_key` values with a `cards.` prefix that shouldn't be there. This causes:
1. Duplicate shortcuts in the "Add Shortcut" modal
2. Translation keys showing as `cards.cards.reembolso` instead of `cards.reembolso`
3. Untranslated text appearing in the UI

## Root Cause
- The `mergeCards()` function in `/api/cards/supabase/route.ts` merges database cards with SYSTEM_MODULES
- SYSTEM_MODULES uses clean IDs like `ponto`, `reembolso`, `contracheque`
- Database cards have `module_key="cards.ponto"` which doesn't match `SYSTEM_MODULE.id="ponto"`
- Result: Both cards appear separately, creating duplicates

## Solution

### Step 1: Run the SQL Migration

Execute the SQL script located at:
```
f:\Code\0_Painel ABZ-BR-INT\painel-abz\scripts\fix-cards-module-key.sql
```

**To apply:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `fix-cards-module-key.sql`
4. Run the query
5. Verify the results

### Step 2: Verify the Fix

After running the migration:
1. Check the `cards` table to ensure `module_key` values no longer have the `cards.` prefix
2. Test the "Add Shortcut" modal - duplicates should be gone
3. Verify translations display correctly

## Expected Changes

**Before:**
```
module_key: "cards.ponto"
module_key: "cards.reembolso"
module_key: "cards.contracheque"
```

**After:**
```
module_key: "ponto"
module_key: "reembolso"
module_key: "contracheque"
```

## Impact
- Fixes duplicate shortcuts
- Fixes translation display (`cards.ponto` instead of `cards.cards.ponto`)
- No downtime required
- Safe operation (only updates existing incorrect prefixes)
