-- Complete Database Schema Migration for METEOR and Sentence-BERT Testing
-- Run this script in Supabase SQL Editor
-- Requirements: 8.4, 3.4

-- =====================================================
-- MIGRATION: METEOR AND SENTENCE-BERT TESTING TABLES
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TEST RESULTS TABLE
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

-- Enable Row Level Security for test_results
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own test results" ON test_results;
DROP POLICY IF EXISTS "Users can insert own test results" ON test_results;
DROP POLICY IF EXISTS "Users can update own test results" ON test_results;
DROP POLICY IF EXISTS "Users can delete own test results" ON test_results;

-- Create RLS policies for test_results
CREATE POLICY "Users can view own test results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results" ON test_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test results" ON test_results
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. SCENARIO REFERENCES TABLE (OPTIONAL)
-- =====================================================

CREATE TABLE IF NOT EXISTS scenario_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference_text TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for scenario_references
ALTER TABLE scenario_references ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage own references" ON scenario_references;

-- Create RLS policy for scenario_references
CREATE POLICY "Users can manage own references" ON scenario_references
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 3. INDEXES FOR OPTIMAL PERFORMANCE
-- =====================================================

-- Indexes for test_results table
CREATE INDEX IF NOT EXISTS idx_test_results_user_scenario ON test_results(user_id, scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_scenario_id ON test_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_user_test_type ON test_results(user_id, test_type);

-- Indexes for scenario_references table
CREATE INDEX IF NOT EXISTS idx_scenario_references_user_id ON scenario_references(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_references_created_at ON scenario_references(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_references_usage_count ON scenario_references(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_references_text_search ON scenario_references 
  USING gin(to_tsvector('english', reference_text));
CREATE INDEX IF NOT EXISTS idx_scenario_references_tags ON scenario_references USING gin(tags);

-- =====================================================
-- 4. TRIGGER FUNCTIONS FOR UPDATED_AT
-- =====================================================

-- Create or replace trigger function for test_results updated_at
CREATE OR REPLACE FUNCTION update_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace trigger function for scenario_references updated_at
CREATE OR REPLACE FUNCTION update_scenario_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Create trigger for test_results updated_at
DROP TRIGGER IF EXISTS update_test_results_updated_at ON test_results;
CREATE TRIGGER update_test_results_updated_at 
    BEFORE UPDATE ON test_results
    FOR EACH ROW EXECUTE FUNCTION update_test_results_updated_at();

-- Create trigger for scenario_references updated_at
DROP TRIGGER IF EXISTS update_scenario_references_updated_at ON scenario_references;
CREATE TRIGGER update_scenario_references_updated_at 
    BEFORE UPDATE ON scenario_references
    FOR EACH ROW EXECUTE FUNCTION update_scenario_references_updated_at();

-- =====================================================
-- 6. TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE test_results IS 'Stores METEOR and Sentence-BERT test results for scenario evaluation';
COMMENT ON COLUMN test_results.scenario_id IS 'Unique identifier for the test scenario';
COMMENT ON COLUMN test_results.test_type IS 'Type of test: meteor or sentence_bert';
COMMENT ON COLUMN test_results.score IS 'Test score with 3 decimal precision (0.000-1.000)';
COMMENT ON COLUMN test_results.generated_text IS 'The generated scenario text being tested';
COMMENT ON COLUMN test_results.reference_text IS 'The reference scenario text for comparison';
COMMENT ON COLUMN test_results.test_details IS 'Additional test metadata and details in JSON format';

COMMENT ON TABLE scenario_references IS 'Stores reusable reference scenarios for testing (optional feature)';
COMMENT ON COLUMN scenario_references.reference_text IS 'The reference scenario text in Gherkin format';
COMMENT ON COLUMN scenario_references.description IS 'Optional description of the reference scenario';
COMMENT ON COLUMN scenario_references.tags IS 'Array of tags for categorizing scenarios';
COMMENT ON COLUMN scenario_references.usage_count IS 'Number of times this reference has been used';

COMMIT;

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Verify table structures
SELECT 'TEST_RESULTS TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'test_results' 
ORDER BY ordinal_position;

SELECT 'SCENARIO_REFERENCES TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'scenario_references' 
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT 'RLS POLICIES:' as info;
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename IN ('test_results', 'scenario_references');

-- Verify indexes
SELECT 'INDEXES:' as info;
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('test_results', 'scenario_references')
ORDER BY tablename, indexname;

-- Success message
SELECT 'METEOR and Sentence-BERT testing schema has been successfully created!' as result;