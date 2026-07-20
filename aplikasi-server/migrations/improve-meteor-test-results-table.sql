-- Migration: Improvements for meteor_test_results table
-- Date: 2026-05-10
-- Purpose: Add constraints, optimize data types, and improve data integrity

-- 1. Add CHECK constraints for data validation
ALTER TABLE meteor_test_results
ADD CONSTRAINT check_meteor_score_range 
  CHECK (meteor_score >= 0 AND meteor_score <= 1),
ADD CONSTRAINT check_precision_range 
  CHECK (precision IS NULL OR (precision >= 0 AND precision <= 1)),
ADD CONSTRAINT check_recall_range 
  CHECK (recall IS NULL OR (recall >= 0 AND recall <= 1)),
ADD CONSTRAINT check_f_mean_range 
  CHECK (f_mean IS NULL OR (f_mean >= 0 AND f_mean <= 1)),
ADD CONSTRAINT check_penalty_range 
  CHECK (penalty IS NULL OR (penalty >= 0 AND penalty <= 1));

-- 2. Add CHECK constraints for section-specific scores
ALTER TABLE meteor_test_results
ADD CONSTRAINT check_given_score_range 
  CHECK (given_score IS NULL OR (given_score >= 0 AND given_score <= 1)),
ADD CONSTRAINT check_when_score_range 
  CHECK (when_score IS NULL OR (when_score >= 0 AND when_score <= 1)),
ADD CONSTRAINT check_then_score_range 
  CHECK (then_score IS NULL OR (then_score >= 0 AND then_score <= 1));

-- 3. Add CHECK constraints for non-negative integers
ALTER TABLE meteor_test_results
ADD CONSTRAINT check_chunks_positive 
  CHECK (chunks IS NULL OR chunks >= 0),
ADD CONSTRAINT check_matches_positive 
  CHECK (matches IS NULL OR matches >= 0),
ADD CONSTRAINT check_generated_tokens_positive 
  CHECK (generated_tokens IS NULL OR generated_tokens >= 0),
ADD CONSTRAINT check_reference_tokens_positive 
  CHECK (reference_tokens IS NULL OR reference_tokens >= 0);

-- 4. Add CHECK constraints for text fields (not empty)
ALTER TABLE meteor_test_results
ADD CONSTRAINT check_generated_text_not_empty 
  CHECK (length(trim(generated_text)) > 0),
ADD CONSTRAINT check_reference_text_not_empty 
  CHECK (length(trim(reference_text)) > 0);

-- 5. Add index for meteor_score (for filtering/sorting by score)
CREATE INDEX IF NOT EXISTS idx_meteor_score 
  ON meteor_test_results USING btree (meteor_score DESC);

-- 6. Add partial index for recent high-quality results
CREATE INDEX IF NOT EXISTS idx_meteor_high_quality_recent 
  ON meteor_test_results USING btree (user_id, created_at DESC)
  WHERE meteor_score >= 0.7;

-- 7. Add GIN index for JSONB translation_info (for JSON queries)
CREATE INDEX IF NOT EXISTS idx_meteor_translation_info 
  ON meteor_test_results USING gin (translation_info);

-- 8. Add comments for better documentation
COMMENT ON TABLE meteor_test_results IS 
  'Stores METEOR evaluation results for BDD scenario testing with section-level and overall metrics';

COMMENT ON COLUMN meteor_test_results.meteor_score IS 
  'Overall METEOR score (0-1 range, higher is better)';

COMMENT ON COLUMN meteor_test_results.scenario_id IS 
  'Reference to the scenario being tested (stored as text for flexibility)';

COMMENT ON COLUMN meteor_test_results.translation_info IS 
  'Additional metadata about translation/evaluation process (JSONB format)';

-- 9. Optional: Add a computed column for quality category (if PostgreSQL >= 12)
-- Uncomment if you want to categorize results automatically
/*
ALTER TABLE meteor_test_results
ADD COLUMN quality_category TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN meteor_score >= 0.8 THEN 'excellent'
    WHEN meteor_score >= 0.6 THEN 'good'
    WHEN meteor_score >= 0.4 THEN 'fair'
    ELSE 'poor'
  END
) STORED;

CREATE INDEX IF NOT EXISTS idx_meteor_quality_category 
  ON meteor_test_results (quality_category);
*/

-- 10. Add RLS (Row Level Security) policies if needed
-- Uncomment and adjust based on your security requirements
/*
ALTER TABLE meteor_test_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own test results
CREATE POLICY meteor_test_results_select_policy ON meteor_test_results
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own test results
CREATE POLICY meteor_test_results_insert_policy ON meteor_test_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own test results
CREATE POLICY meteor_test_results_update_policy ON meteor_test_results
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can only delete their own test results
CREATE POLICY meteor_test_results_delete_policy ON meteor_test_results
  FOR DELETE
  USING (auth.uid() = user_id);
*/
