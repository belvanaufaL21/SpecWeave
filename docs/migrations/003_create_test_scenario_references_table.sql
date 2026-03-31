-- Migration: Create test_scenario_references table
-- This table stores user-input reference scenarios for METEOR and Sentence-BERT testing
-- Requirements: 3.4

-- =====================================================
-- TEST SCENARIO REFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS test_scenario_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reference_text TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable Row Level Security
ALTER TABLE test_scenario_references ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage own test references" ON test_scenario_references;

-- Create comprehensive RLS policy
CREATE POLICY "Users can manage own test references" ON test_scenario_references
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- =====================================================

-- Primary indexes for common queries
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_user_id ON test_scenario_references(user_id);
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_created_at ON test_scenario_references(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_usage_count ON test_scenario_references(usage_count DESC);

-- Full-text search index for reference text
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_text_search ON test_scenario_references 
  USING gin(to_tsvector('english', reference_text));

-- Index for tags array
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_tags ON test_scenario_references USING gin(tags);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_test_scenario_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_test_scenario_references_updated_at ON test_scenario_references;
CREATE TRIGGER update_test_scenario_references_updated_at 
    BEFORE UPDATE ON test_scenario_references
    FOR EACH ROW EXECUTE FUNCTION update_test_scenario_references_updated_at();

-- =====================================================
-- TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE test_scenario_references IS 'Stores user-input reference scenarios for METEOR and Sentence-BERT testing';
COMMENT ON COLUMN test_scenario_references.reference_text IS 'The reference scenario text input by user for testing comparison';
COMMENT ON COLUMN test_scenario_references.description IS 'Optional description of the reference scenario';
COMMENT ON COLUMN test_scenario_references.tags IS 'Array of tags for categorizing test scenarios (e.g., meteor, sentence_bert)';
COMMENT ON COLUMN test_scenario_references.usage_count IS 'Number of times this reference has been used in testing';