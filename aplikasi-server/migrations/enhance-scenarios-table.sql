-- ============================================================================
-- Migration: Enhance Scenarios Table
-- ============================================================================
-- Menambahkan kolom untuk tracking reference library yang digunakan
-- saat generate scenario (few-shot prompting).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add reference library tracking
-- ============================================================================
-- Cukup 1 kolom array untuk menyimpan ID reference library yang digunakan

ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS reference_library_ids uuid[] NULL;

COMMENT ON COLUMN scenarios.reference_library_ids IS 'Array of scenario IDs used as few-shot examples during generation';

-- ============================================================================
-- 2. Add token usage tracking (OPTIONAL - untuk monitoring cost)
-- ============================================================================

ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS prompt_tokens integer NULL,
  ADD COLUMN IF NOT EXISTS completion_tokens integer NULL,
  ADD COLUMN IF NOT EXISTS total_tokens integer NULL;

COMMENT ON COLUMN scenarios.prompt_tokens IS 'Number of tokens in the input prompt';
COMMENT ON COLUMN scenarios.completion_tokens IS 'Number of tokens in the generated output';
COMMENT ON COLUMN scenarios.total_tokens IS 'Total tokens used (prompt + completion)';

-- ============================================================================
-- 3. Add model information (OPTIONAL - untuk A/B testing)
-- ============================================================================

ALTER TABLE scenarios
  ADD COLUMN IF NOT EXISTS model_used character varying(100) NULL;

COMMENT ON COLUMN scenarios.model_used IS 'AI model used for generation (e.g., gpt-4-turbo, claude-3-opus, gemini-pro)';

-- ============================================================================
-- 4. Add indexes
-- ============================================================================

-- GIN index untuk array search (cari scenario yang pakai reference tertentu)
CREATE INDEX IF NOT EXISTS idx_scenarios_reference_library_ids 
  ON scenarios USING gin (reference_library_ids);

-- Index untuk filtering by model (OPTIONAL)
CREATE INDEX IF NOT EXISTS idx_scenarios_model_used 
  ON scenarios USING btree (model_used) 
  WHERE model_used IS NOT NULL;

-- ============================================================================
-- 5. Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== SCENARIOS TABLE ENHANCEMENT ===';
  RAISE NOTICE 'Added column: reference_library_ids (uuid[])';
  RAISE NOTICE 'Added column: prompt_tokens, completion_tokens, total_tokens (optional)';
  RAISE NOTICE 'Added column: model_used (optional)';
  RAISE NOTICE '';
  RAISE NOTICE 'Index created: idx_scenarios_reference_library_ids (GIN)';
  RAISE NOTICE 'Index created: idx_scenarios_model_used (B-tree)';
END $$;

COMMIT;

-- ============================================================================
-- Rollback (jika diperlukan)
-- ============================================================================
/*
BEGIN;

ALTER TABLE scenarios
  DROP COLUMN IF EXISTS reference_library_ids,
  DROP COLUMN IF EXISTS prompt_tokens,
  DROP COLUMN IF EXISTS completion_tokens,
  DROP COLUMN IF EXISTS total_tokens,
  DROP COLUMN IF EXISTS model_used;

DROP INDEX IF EXISTS idx_scenarios_reference_library_ids;
DROP INDEX IF EXISTS idx_scenarios_model_used;

COMMIT;
*/
