-- Migration: Enable Multiple JIRA Project Connections
-- Date: 2026-05-03
-- Description: Remove constraint that limits users to only one active JIRA project connection
--              Users should be able to connect multiple projects from same or different JIRA URLs

-- Step 1: Drop the unique index that enforces one active connection per user
DROP INDEX IF EXISTS idx_jira_connections_one_active_per_user;

-- Step 2: Create a new non-unique index for performance (without uniqueness constraint)
CREATE INDEX IF NOT EXISTS idx_jira_connections_user_active 
ON public.jira_connections (user_id, is_active) 
WHERE is_active = true;

-- Step 3: Add comment to document the change
COMMENT ON TABLE public.jira_connections IS 'JIRA project connections - users can have multiple active connections';

-- Step 4: Verify the change
DO $$ 
BEGIN
    -- Check if the unique index was successfully dropped
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_jira_connections_one_active_per_user'
    ) THEN
        RAISE EXCEPTION 'Failed to drop unique index idx_jira_connections_one_active_per_user';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully - users can now have multiple active JIRA connections';
END $$;
