-- Migration: Remove user_active_projects table and use is_active in jira_connections
-- Date: 2024-01-XX
-- Description: Simplify active project management by using is_active flag in jira_connections

-- Step 1: Drop the user_active_projects table
DROP TABLE IF EXISTS public.user_active_projects CASCADE;

-- Step 2: Ensure is_active field exists in jira_connections (should already exist)
-- This is just a safety check
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jira_connections' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.jira_connections 
        ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- Step 3: Set all connections to inactive first (user will select active project again)
UPDATE public.jira_connections SET is_active = false;

-- Step 4: Create index for faster queries on is_active (if not exists)
CREATE INDEX IF NOT EXISTS idx_jira_connections_user_active 
ON public.jira_connections (user_id, is_active) 
WHERE is_active = true;

-- Step 5: Add constraint to ensure only one active connection per user
-- First, create a unique partial index
DROP INDEX IF EXISTS idx_jira_connections_one_active_per_user;
CREATE UNIQUE INDEX idx_jira_connections_one_active_per_user 
ON public.jira_connections (user_id) 
WHERE is_active = true;

-- Migration complete
-- Note: Users will need to select their active project again after this migration
