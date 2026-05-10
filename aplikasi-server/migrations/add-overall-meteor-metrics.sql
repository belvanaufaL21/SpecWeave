-- Migration: Add overall METEOR metrics columns
-- Date: 2026-05-10
-- Purpose: Store full-text evaluation metrics (not just per-section)

-- Add overall metrics columns to meteor_test_results table
ALTER TABLE meteor_test_results
ADD COLUMN IF NOT EXISTS precision DECIMAL,
ADD COLUMN IF NOT EXISTS recall DECIMAL,
ADD COLUMN IF NOT EXISTS f_mean DECIMAL,
ADD COLUMN IF NOT EXISTS penalty DECIMAL,
ADD COLUMN IF NOT EXISTS chunks INTEGER,
ADD COLUMN IF NOT EXISTS matches INTEGER,
ADD COLUMN IF NOT EXISTS generated_tokens INTEGER,
ADD COLUMN IF NOT EXISTS reference_tokens INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN meteor_test_results.precision IS 'Overall precision from full-text evaluation (matches / generated_tokens)';
COMMENT ON COLUMN meteor_test_results.recall IS 'Overall recall from full-text evaluation (matches / reference_tokens)';
COMMENT ON COLUMN meteor_test_results.f_mean IS 'Overall F-Mean from full-text evaluation (10*P*R / (9*P + R))';
COMMENT ON COLUMN meteor_test_results.penalty IS 'Overall penalty from full-text evaluation (0.5 * (chunks/matches)³)';
COMMENT ON COLUMN meteor_test_results.chunks IS 'Number of chunks in full-text alignment';
COMMENT ON COLUMN meteor_test_results.matches IS 'Number of matched tokens in full-text';
COMMENT ON COLUMN meteor_test_results.generated_tokens IS 'Total tokens in generated (hypothesis) text';
COMMENT ON COLUMN meteor_test_results.reference_tokens IS 'Total tokens in reference text';

-- Note: These columns store OVERALL metrics from full-text evaluation
-- Section-specific metrics (given_*, when_*, then_*) remain for diagnostics
