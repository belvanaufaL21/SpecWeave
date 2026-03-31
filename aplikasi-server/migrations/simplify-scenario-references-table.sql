-- Migration: Simplify scenario_references table
-- Purpose: Remove unused columns and indexes after removing default references feature
-- Date: 2024

-- Step 1: Drop RLS policies that depend on columns we want to remove
DROP POLICY IF EXISTS "Users can view own references" ON scenario_references;
DROP POLICY IF EXISTS "Users can view public references" ON scenario_references;
DROP POLICY IF EXISTS "Users can insert own references" ON scenario_references;
DROP POLICY IF EXISTS "Users can update own references" ON scenario_references;
DROP POLICY IF EXISTS "Users can delete own references" ON scenario_references;

-- Step 2: Drop unused indexes
DROP INDEX IF EXISTS idx_scenario_references_category;
DROP INDEX IF EXISTS idx_scenario_references_tags;
DROP INDEX IF EXISTS idx_scenario_references_usage_count;
DROP INDEX IF EXISTS idx_scenario_references_public;

-- Step 3: Drop unused columns
ALTER TABLE scenario_references DROP COLUMN IF EXISTS description;
ALTER TABLE scenario_references DROP COLUMN IF EXISTS category;
ALTER TABLE scenario_references DROP COLUMN IF EXISTS tags;
ALTER TABLE scenario_references DROP COLUMN IF EXISTS usage_count;
ALTER TABLE scenario_references DROP COLUMN IF EXISTS average_score;
ALTER TABLE scenario_references DROP COLUMN IF EXISTS is_public;

-- Step 4: Recreate simplified RLS policies (without is_public dependency)
-- Enable RLS if not already enabled
ALTER TABLE scenario_references ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own references
CREATE POLICY "Users can view own references" 
ON scenario_references 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own references
CREATE POLICY "Users can insert own references" 
ON scenario_references 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own references
CREATE POLICY "Users can update own references" 
ON scenario_references 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own references
CREATE POLICY "Users can delete own references" 
ON scenario_references 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 5: Verify remaining structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'scenario_references' 
ORDER BY ordinal_position;

-- Expected columns after migration:
-- 1. id (uuid, not null, default gen_random_uuid())
-- 2. user_id (uuid, nullable, FK to auth.users)
-- 3. title (varchar(255), not null)
-- 4. gherkin_content (text, not null)
-- 5. created_at (timestamp with time zone, default now())
-- 6. updated_at (timestamp with time zone, default now())
