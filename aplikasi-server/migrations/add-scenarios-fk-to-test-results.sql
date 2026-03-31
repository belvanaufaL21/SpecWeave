-- Migration: Add foreign key to scenarios table
-- Purpose: Link test_results to scenarios table to get title dynamically
-- Date: 2025-01-25

-- Step 1: Add new column for scenarios FK (nullable for backward compatibility)
ALTER TABLE public.test_results
ADD COLUMN IF NOT EXISTS scenarios_id UUID;

-- Step 2: Add foreign key constraint
ALTER TABLE public.test_results
ADD CONSTRAINT test_results_scenarios_id_fkey 
FOREIGN KEY (scenarios_id) 
REFERENCES public.scenarios(id) 
ON DELETE SET NULL;

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_test_results_scenarios_id 
ON public.test_results (scenarios_id);

-- Step 4: Add comment
COMMENT ON COLUMN public.test_results.scenarios_id IS 'Foreign key to scenarios table to get scenario title dynamically';

-- Note: scenario_index column already exists to identify which scenario in scenarios_json
-- Usage: JOIN scenarios and extract scenarios_json[scenario_index].title
