-- Migration: Fix user_test_results constraint for UPSERT
-- This migration updates existing table without dropping data

BEGIN;

-- Check if table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_test_results') THEN
        -- Create table if it doesn't exist
        CREATE TABLE user_test_results (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          scenario_id TEXT NOT NULL,
          message_id TEXT NOT NULL,
          scenario_index INTEGER NOT NULL,
          meteor_score DECIMAL(5,3) NOT NULL DEFAULT 0,
          test_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Table user_test_results created';
    ELSE
        RAISE NOTICE 'Table user_test_results already exists';
    END IF;
END $$;

-- Drop old constraint if exists (might have different name)
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find existing unique constraint on user_id, scenario_id
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'user_test_results'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 2
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE user_test_results DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped old constraint: %', constraint_name;
    END IF;
END $$;

-- Add correct constraint for UPSERT
ALTER TABLE user_test_results 
DROP CONSTRAINT IF EXISTS unique_user_scenario;

ALTER TABLE user_test_results 
ADD CONSTRAINT unique_user_scenario UNIQUE(user_id, scenario_id);

-- Ensure columns exist (add if missing)
DO $$ 
BEGIN
    -- Add message_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_test_results' AND column_name='message_id') THEN
        ALTER TABLE user_test_results ADD COLUMN message_id TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added message_id column';
    END IF;
    
    -- Add scenario_index if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_test_results' AND column_name='scenario_index') THEN
        ALTER TABLE user_test_results ADD COLUMN scenario_index INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added scenario_index column';
    END IF;
    
    -- Add meteor_score if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_test_results' AND column_name='meteor_score') THEN
        ALTER TABLE user_test_results ADD COLUMN meteor_score DECIMAL(5,3) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added meteor_score column';
    END IF;
    
    -- Add test_data if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_test_results' AND column_name='test_data') THEN
        ALTER TABLE user_test_results ADD COLUMN test_data JSONB NOT NULL DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added test_data column';
    END IF;
END $$;

-- Enable Row Level Security if not enabled
ALTER TABLE user_test_results ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can view own test results" ON user_test_results;
DROP POLICY IF EXISTS "Users can insert own test results" ON user_test_results;
DROP POLICY IF EXISTS "Users can update own test results" ON user_test_results;
DROP POLICY IF EXISTS "Users can delete own test results" ON user_test_results;

CREATE POLICY "Users can view own test results" ON user_test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON user_test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results" ON user_test_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test results" ON user_test_results
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_user_test_results_user_id ON user_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_scenario_id ON user_test_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_message_id ON user_test_results(message_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_user_scenario ON user_test_results(user_id, scenario_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_created_at ON user_test_results(created_at DESC);

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION update_user_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_user_test_results_updated_at ON user_test_results;
CREATE TRIGGER update_user_test_results_updated_at 
    BEFORE UPDATE ON user_test_results
    FOR EACH ROW EXECUTE FUNCTION update_user_test_results_updated_at();

COMMIT;

-- Verification
SELECT '✅ Migration completed successfully!' as result;

-- Show current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_test_results' 
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_test_results'::regclass;
