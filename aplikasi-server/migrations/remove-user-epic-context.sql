-- Migration: Remove user_epic_context table (Epic is now global, stored in localStorage)
-- Date: 2024-01-XX
-- Description: Simplify epic management by making it global like active project

-- Step 1: Drop the user_epic_context table
DROP TABLE IF EXISTS public.user_epic_context CASCADE;

-- Migration complete
-- Note: Epic context is now stored in localStorage only (global per user)
-- Users will need to select their epic again after this migration
