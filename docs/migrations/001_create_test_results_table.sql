-- Migration: Create test_results table for METEOR and Sentence-BERT testing
-- This table supports both METEOR and Sentence-BERT test results
-- Requirements: 8.4, 3.4

-- =====================================================
-- TEST RESULTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scenario_id TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('meteor', 'sentence_bert')),
  score DECIMAL(5,3) NOT NULL,
  generated_text TEXT NOT NULL,
  reference_text TEXT NOT NULL,
  test_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique test result per scenario per user per test type
  UNIQUE(user_id, scenario_id, test_type)
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable Row Level Security
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete own test results" ON test_results;

-- Create RLS policies
CREATE POLICY "Users can view own test results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results" ON test_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test results" ON test_results
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- =====================================================

-- Primary indexes for common queries
CREATE INDEX IF NOT EXISTS idx_test_results_user_scenario ON test_results(user_id, scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_scenario_id ON test_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at DESC);

-- Composite index for filtering by user and test type
CREATE INDEX IF NOT EXISTS idx_test_results_user_test_type ON test_results(user_id, test_type);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at 
    BEFORE UPDATE ON test_results
    FOR EACH ROW EXECUTE FUNCTION update_test_results_updated_at();

-- =====================================================
-- TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE test_results IS 'Stores METEOR and Sentence-BERT test results for scenario evaluation';
COMMENT ON COLUMN test_results.scenario_id IS 'Unique identifier for the test scenario';
COMMENT ON COLUMN test_results.test_type IS 'Type of test: meteor or sentence_bert';
COMMENT ON COLUMN test_results.score IS 'Test score with 3 decimal precision (0.000-1.000)';
COMMENT ON COLUMN test_results.generated_text IS 'The generated scenario text being tested';
COMMENT ON COLUMN test_results.reference_text IS 'The reference scenario text for comparison';
COMMENT ON COLUMN test_results.test_details IS 'Additional test metadata and details in JSON format';