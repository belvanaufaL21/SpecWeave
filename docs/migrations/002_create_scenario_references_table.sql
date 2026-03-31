-- Migration: Create scenario_references table (Optional)
-- This table stores reusable reference scenarios for future enhancement
-- Requirements: 3.4

-- =====================================================
-- SCENARIO REFERENCES TABLE (OPTIONAL)
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

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable Row Level Security
ALTER TABLE scenario_references ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage own references" ON scenario_references;

-- Create comprehensive RLS policy
CREATE POLICY "Users can manage own references" ON scenario_references
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- =====================================================

-- Primary indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scenario_references_user_id ON scenario_references(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_references_created_at ON scenario_references(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_references_usage_count ON scenario_references(usage_count DESC);

-- Full-text search index for reference text
CREATE INDEX IF NOT EXISTS idx_scenario_references_text_search ON scenario_references 
  USING gin(to_tsvector('english', reference_text));

-- Index for tags array
CREATE INDEX IF NOT EXISTS idx_scenario_references_tags ON scenario_references USING gin(tags);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_scenario_references_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_scenario_references_updated_at ON scenario_references;
CREATE TRIGGER update_scenario_references_updated_at 
    BEFORE UPDATE ON scenario_references
    FOR EACH ROW EXECUTE FUNCTION update_scenario_references_updated_at();

-- =====================================================
-- TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE scenario_references IS 'Stores reusable reference scenarios for testing (optional feature)';
COMMENT ON COLUMN scenario_references.reference_text IS 'The reference scenario text in Gherkin format';
COMMENT ON COLUMN scenario_references.description IS 'Optional description of the reference scenario';
COMMENT ON COLUMN scenario_references.tags IS 'Array of tags for categorizing scenarios';
COMMENT ON COLUMN scenario_references.usage_count IS 'Number of times this reference has been used';