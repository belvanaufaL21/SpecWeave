-- Migration: Allow multiple test types per scenario
-- This allows saving both METEOR and Sentence-BERT results for the same scenario

BEGIN;

-- Drop old constraint that only allows one test per scenario
ALTER TABLE user_test_results 
DROP CONSTRAINT IF EXISTS user_test_results_user_scenario_unique;

-- Add test_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user_test_results' AND column_name='test_type') THEN
        ALTER TABLE user_test_results ADD COLUMN test_type TEXT NOT NULL DEFAULT 'meteor';
        RAISE NOTICE 'Added test_type column';
    END IF;
END $$;

-- Add new constraint that includes test_type
-- This allows multiple test types (meteor, sentence_bert) for the same scenario
ALTER TABLE user_test_results 
ADD CONSTRAINT user_test_results_user_scenario_type_unique 
UNIQUE(user_id, scenario_id, test_type);

-- Add check constraint for valid test types
ALTER TABLE user_test_results
DROP CONSTRAINT IF EXISTS user_test_results_test_type_check;

ALTER TABLE user_test_results
ADD CONSTRAINT user_test_results_test_type_check 
CHECK (test_type IN ('meteor', 'sentence_bert', 'dual'));

-- Create index for test_type queries
CREATE INDEX IF NOT EXISTS idx_user_test_results_test_type 
ON user_test_results(test_type);

CREATE INDEX IF NOT EXISTS idx_user_test_results_user_scenario_type 
ON user_test_results(user_id, scenario_id, test_type);

COMMIT;

-- Verification
SELECT '✅ Migration completed! Multiple test types now allowed per scenario.' as result;

-- Show current constraints
SELECT 
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'user_test_results'::regclass
ORDER BY contype, conname;

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_test_results' 
ORDER BY ordinal_position;
