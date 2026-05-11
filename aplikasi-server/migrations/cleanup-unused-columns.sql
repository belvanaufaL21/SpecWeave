-- ============================================================================
-- Migration: Cleanup Unused Columns
-- ============================================================================
-- Menghapus kolom-kolom yang tidak digunakan setelah refactor evaluasi
-- dari per-section ke full-text scoring.
--
-- CONTEXT:
-- 1. METEOR & Sentence-BERT sekarang menghitung skor utama pada FULL TEXT
-- 2. Per-section metrics tidak ditampilkan di frontend (UI tabs dihapus)
-- 3. Banyak kolom di database tidak pernah diisi atau tidak diquery
--
-- BACKUP RECOMMENDATION:
-- Backup data sebelum menjalankan migration ini jika ada kebutuhan
-- untuk restore section scores di masa depan.
-- ============================================================================

BEGIN;

-- ============================================================================
-- METEOR: Drop per-section columns (27 kolom)
-- ============================================================================
-- Section scores tidak ditampilkan di UI lagi setelah simplifikasi.
-- Data historis akan hilang, tapi tidak digunakan di aplikasi.

ALTER TABLE meteor_test_results
  -- Given section (9 kolom)
  DROP COLUMN IF EXISTS given_score,
  DROP COLUMN IF EXISTS given_precision,
  DROP COLUMN IF EXISTS given_recall,
  DROP COLUMN IF EXISTS given_f_mean,
  DROP COLUMN IF EXISTS given_penalty,
  DROP COLUMN IF EXISTS given_chunks,
  DROP COLUMN IF EXISTS given_matches,
  DROP COLUMN IF EXISTS given_generated_tokens,
  DROP COLUMN IF EXISTS given_reference_tokens,
  
  -- When section (9 kolom)
  DROP COLUMN IF EXISTS when_score,
  DROP COLUMN IF EXISTS when_precision,
  DROP COLUMN IF EXISTS when_recall,
  DROP COLUMN IF EXISTS when_f_mean,
  DROP COLUMN IF EXISTS when_penalty,
  DROP COLUMN IF EXISTS when_chunks,
  DROP COLUMN IF EXISTS when_matches,
  DROP COLUMN IF EXISTS when_generated_tokens,
  DROP COLUMN IF EXISTS when_reference_tokens,
  
  -- Then section (9 kolom)
  DROP COLUMN IF EXISTS then_score,
  DROP COLUMN IF EXISTS then_precision,
  DROP COLUMN IF EXISTS then_recall,
  DROP COLUMN IF EXISTS then_f_mean,
  DROP COLUMN IF EXISTS then_penalty,
  DROP COLUMN IF EXISTS then_chunks,
  DROP COLUMN IF EXISTS then_matches,
  DROP COLUMN IF EXISTS then_generated_tokens,
  DROP COLUMN IF EXISTS then_reference_tokens;

-- ============================================================================
-- METEOR: Drop updated_at column
-- ============================================================================
-- Test results adalah insert-only data, tidak pernah di-update.
-- Trigger update_meteor_test_results_updated_at juga tidak berguna.

-- Drop trigger dulu
DROP TRIGGER IF EXISTS update_meteor_test_results_updated_at ON meteor_test_results;

-- Drop column
ALTER TABLE meteor_test_results
  DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- SENTENCE-BERT: Drop per-section columns (3 kolom)
-- ============================================================================
-- Section scores tidak ditampilkan di UI lagi.

ALTER TABLE sentence_bert_test_results
  DROP COLUMN IF EXISTS given_score,
  DROP COLUMN IF EXISTS when_score,
  DROP COLUMN IF EXISTS then_score;

-- ============================================================================
-- SENTENCE-BERT: Drop updated_at column
-- ============================================================================
-- Sama seperti METEOR, test results tidak pernah di-update.

-- Drop trigger dulu
DROP TRIGGER IF EXISTS update_sentence_bert_test_results_updated_at ON sentence_bert_test_results;

-- Drop column
ALTER TABLE sentence_bert_test_results
  DROP COLUMN IF EXISTS updated_at;

-- ============================================================================
-- Verification: Show remaining columns
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== METEOR TEST RESULTS COLUMNS (after cleanup) ===';
  RAISE NOTICE '%', (
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_name = 'meteor_test_results'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '=== SENTENCE-BERT TEST RESULTS COLUMNS (after cleanup) ===';
  RAISE NOTICE '%', (
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_name = 'sentence_bert_test_results'
  );
END $$;

COMMIT;

-- ============================================================================
-- Expected remaining columns:
-- ============================================================================
-- meteor_test_results (12 kolom):
--   - id, user_id, scenario_id
--   - meteor_score (main score)
--   - precision, recall, f_mean, penalty, chunks, matches (overall metrics)
--   - generated_tokens, reference_tokens (overall token counts)
--   - generated_text, reference_text
--   - translation_info (JSONB)
--   - created_at
--
-- sentence_bert_test_results (9 kolom):
--   - id, user_id, scenario_id
--   - similarity_score (main score)
--   - generated_text, reference_text
--   - details (JSONB - contains overall_embeddings for accordion display)
--   - created_at
-- ============================================================================
