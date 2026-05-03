-- Migration: Restore Inactive JIRA Connections
-- Date: 2026-05-03
-- Description: Set all existing connections to active (is_active = true)
--              This fixes the issue where old connections were set to inactive
--              when new connections were added

-- Step 1: Update all connections to active
UPDATE public.jira_connections
SET 
    is_active = true,
    updated_at = NOW()
WHERE is_active = false;

-- Step 2: Verify the update
DO $$ 
DECLARE
    total_connections INTEGER;
    active_connections INTEGER;
    inactive_connections INTEGER;
BEGIN
    -- Count total connections
    SELECT COUNT(*) INTO total_connections FROM public.jira_connections;
    
    -- Count active connections
    SELECT COUNT(*) INTO active_connections FROM public.jira_connections WHERE is_active = true;
    
    -- Count inactive connections
    SELECT COUNT(*) INTO inactive_connections FROM public.jira_connections WHERE is_active = false;
    
    RAISE NOTICE '=== JIRA Connections Status ===';
    RAISE NOTICE 'Total connections: %', total_connections;
    RAISE NOTICE 'Active connections: %', active_connections;
    RAISE NOTICE 'Inactive connections: %', inactive_connections;
    
    IF inactive_connections > 0 THEN
        RAISE WARNING 'Still have % inactive connections!', inactive_connections;
    ELSE
        RAISE NOTICE '✅ All connections are now active!';
    END IF;
END $$;

-- Step 3: Show connections per user
SELECT 
    user_id,
    COUNT(*) as total_connections,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_connections,
    array_agg(project_key ORDER BY created_at DESC) as projects
FROM public.jira_connections
GROUP BY user_id
ORDER BY total_connections DESC;
