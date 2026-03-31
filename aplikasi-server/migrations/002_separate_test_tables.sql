-- Migration: Separate test results into meteor_test_results and sentence_bert_test_results
-- This makes the data structure clearer and easier to query

-- ============================================
-- 1. CREATE NEW TABLES
-- ============================================

-- Table for METEOR test results
CREATE TABLE IF NOT EXISTS meteor_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  
  -- Overall METEOR score (average of 3 sections)
  meteor_score DECIMAL(10, 8) NOT NULL,
  
  -- Section-level metrics (Given/When/Then)
  -- Each section has complete METEOR metrics
  given_score DECIMAL(10, 8),
  given_precision DECIMAL(10, 8),
  given_recall DECIMAL(10, 8),
  given_f_mean DECIMAL(10, 8),
  given_penalty DECIMAL(10, 8),
  given_chunks INTEGER,
  given_matches INTEGER,
  given_generated_tokens INTEGER,
  given_reference_tokens INTEGER,
  
  when_score DECIMAL(10, 8),
  when_precision DECIMAL(10, 8),
  when_recall DECIMAL(10, 8),
  when_f_mean DECIMAL(10, 8),
  when_penalty DECIMAL(10, 8),
  when_chunks INTEGER,
  when_matches INTEGER,
  when_generated_tokens INTEGER,
  when_reference_tokens INTEGER,
  
  then_score DECIMAL(10, 8),
  then_precision DECIMAL(10, 8),
  then_recall DECIMAL(10, 8),
  then_f_mean DECIMAL(10, 8),
  then_penalty DECIMAL(10, 8),
  then_chunks INTEGER,
  then_matches INTEGER,
  then_generated_tokens INTEGER,
  then_reference_tokens INTEGER,
  
  -- Text data
  generated_text TEXT NOT NULL,
  reference_text TEXT NOT NULL,
  
  -- Additional metadata
  translation_info JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Sentence-BERT test results
CREATE TABLE IF NOT EXISTS sentence_bert_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  
  -- Overall Sentence-BERT score (calculated from full text, NOT average of sections)
  similarity_score DECIMAL(10, 8) NOT NULL,
  
  -- Section-level scores (Given/When/Then)
  -- Each section calculated independently
  given_score DECIMAL(10, 8),
  when_score DECIMAL(10, 8),
  then_score DECIMAL(10, 8),
  
  -- Text data
  generated_text TEXT NOT NULL,
  reference_text TEXT NOT NULL,
  
  -- Additional details (embeddings, etc.) stored as JSONB
  -- Contains: section_embeddings, section_details, overall_embeddings, dot_product, magnitude_a, magnitude_b
  details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Indexes for meteor_test_results
CREATE INDEX idx_meteor_user_id ON meteor_test_results(user_id);
CREATE INDEX idx_meteor_scenario_id ON meteor_test_results(scenario_id);
CREATE INDEX idx_meteor_created_at ON meteor_test_results(created_at DESC);
CREATE INDEX idx_meteor_user_scenario ON meteor_test_results(user_id, scenario_id);

-- Indexes for sentence_bert_test_results
CREATE INDEX idx_sbert_user_id ON sentence_bert_test_results(user_id);
CREATE INDEX idx_sbert_scenario_id ON sentence_bert_test_results(scenario_id);
CREATE INDEX idx_sbert_created_at ON sentence_bert_test_results(created_at DESC);
CREATE INDEX idx_sbert_user_scenario ON sentence_bert_test_results(user_id, scenario_id);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE meteor_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_bert_test_results ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Policies for meteor_test_results
CREATE POLICY "Users can view their own meteor results"
  ON meteor_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meteor results"
  ON meteor_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meteor results"
  ON meteor_test_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meteor results"
  ON meteor_test_results FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for sentence_bert_test_results
CREATE POLICY "Users can view their own sentence-bert results"
  ON sentence_bert_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sentence-bert results"
  ON sentence_bert_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sentence-bert results"
  ON sentence_bert_test_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sentence-bert results"
  ON sentence_bert_test_results FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. CREATE UPDATED_AT TRIGGERS
-- ============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to meteor_test_results
CREATE TRIGGER update_meteor_test_results_updated_at
  BEFORE UPDATE ON meteor_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to sentence_bert_test_results
CREATE TRIGGER update_sentence_bert_test_results_updated_at
  BEFORE UPDATE ON sentence_bert_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. MIGRATION NOTES
-- ============================================

-- NOTE: Old test_results table is NOT dropped automatically
-- You can manually drop it after verifying the migration:
-- DROP TABLE IF EXISTS test_results CASCADE;

-- To migrate existing data (if needed), you would need to:
-- 1. Extract meteor results from test_results where test_type = 'meteor'
-- 2. Extract sentence_bert results from test_results where test_type = 'sentence_bert'
-- 3. Transform the JSONB test_details into the new column structure
-- 4. Insert into the new tables

COMMENT ON TABLE meteor_test_results IS 'Stores METEOR evaluation results with section-level metrics';
COMMENT ON TABLE sentence_bert_test_results IS 'Stores Sentence-BERT evaluation results with section-level scores';
