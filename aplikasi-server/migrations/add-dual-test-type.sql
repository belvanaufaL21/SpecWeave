-- Migration: Add 'dual' test type support to test_results table
-- Date: 2024
-- Description: Update test_type constraint to support 'dual' evaluation mode

-- Drop existing constraint
ALTER TABLE public.test_results 
DROP CONSTRAINT IF EXISTS test_results_test_type_check;

-- Add new constraint with 'dual' support
ALTER TABLE public.test_results 
ADD CONSTRAINT test_results_test_type_check 
CHECK (test_type = ANY (ARRAY['meteor'::text, 'sentence_bert'::text, 'dual'::text]));

-- Verify constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.test_results'::regclass
AND conname = 'test_results_test_type_check';

-- Test insert with 'dual' type (should succeed)
-- Uncomment to test:
-- INSERT INTO public.test_results (
--     user_id, 
--     scenario_id, 
--     test_type, 
--     score, 
--     generated_text, 
--     reference_text
-- ) VALUES (
--     (SELECT id FROM auth.users LIMIT 1),
--     'test-scenario-dual',
--     'dual',
--     0.85,
--     'Test generated text',
--     'Test reference text'
-- );

COMMENT ON CONSTRAINT test_results_test_type_check ON public.test_results 
IS 'Allows meteor, sentence_bert, and dual test types';
