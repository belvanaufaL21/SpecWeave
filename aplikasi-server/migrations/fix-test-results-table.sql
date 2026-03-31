-- Migration: Fix Test Results Table Structure
-- Date: 2024
-- Description: Ensure test_results table supports dual testing and has all required fields

-- Step 1: Add missing columns if they don't exist
ALTER TABLE public.test_results 
ADD COLUMN IF NOT EXISTS message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS scenario_index INTEGER;

-- Step 2: Update test_type constraint to support 'dual'
ALTER TABLE public.test_results 
DROP CONSTRAINT IF EXISTS test_results_test_type_check;

ALTER TABLE public.test_results 
ADD CONSTRAINT test_results_test_type_check 
CHECK (test_type = ANY (ARRAY['meteor'::text, 'sentence_bert'::text, 'dual'::text]));

-- Step 3: Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_test_results_message_id 
ON public.test_results USING btree (message_id);

CREATE INDEX IF NOT EXISTS idx_test_results_scenario_index 
ON public.test_results USING btree (scenario_index);

-- Step 4: Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_test_results_message_scenario 
ON public.test_results USING btree (message_id, scenario_index);

-- Step 5: Verify structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'test_results'
ORDER BY ordinal_position;

-- Step 6: Verify constraints
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.test_results'::regclass
ORDER BY conname;

-- Step 7: Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'test_results'
ORDER BY indexname;

COMMENT ON TABLE public.test_results 
IS 'Stores test results for METEOR, Sentence-BERT, and dual evaluations';

COMMENT ON COLUMN public.test_results.message_id 
IS 'Message ID from chat for linking test results to specific messages';

COMMENT ON COLUMN public.test_results.scenario_index 
IS 'Index of scenario within the message (0-based)';

COMMENT ON COLUMN public.test_results.test_type 
IS 'Type of test: meteor, sentence_bert, or dual';
