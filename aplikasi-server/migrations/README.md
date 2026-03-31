# Database Migrations

## Overview

This directory contains database migration scripts for the SpecWeave application.

## Migration 002: Separate Test Tables

**File**: `002_separate_test_tables.sql`

**Purpose**: Separate the generic `test_results` table into two specialized tables:
- `meteor_test_results` - For METEOR evaluation results
- `sentence_bert_test_results` - For Sentence-BERT evaluation results

### Why This Migration?

The old `test_results` table had several issues:
1. Generic `score` column was ambiguous (METEOR score? Sentence-BERT score?)
2. Section-level metrics were buried in JSONB `test_details` column
3. Difficult to query specific metrics efficiently
4. Mixed data structures for different test types

### New Structure

#### meteor_test_results
- Clear column names: `meteor_score` (overall average)
- Section-level columns with complete metrics for each section:
  - Given: `given_score`, `given_precision`, `given_recall`, `given_f_mean`, `given_penalty`, `given_chunks`, `given_matches`, `given_generated_tokens`, `given_reference_tokens`
  - When: `when_score`, `when_precision`, `when_recall`, `when_f_mean`, `when_penalty`, `when_chunks`, `when_matches`, `when_generated_tokens`, `when_reference_tokens`
  - Then: `then_score`, `then_precision`, `then_recall`, `then_f_mean`, `then_penalty`, `then_chunks`, `then_matches`, `then_generated_tokens`, `then_reference_tokens`
- Easy to query and aggregate
- Proper indexes for performance
- **Note**: Overall metrics (precision, recall, etc.) are NOT stored separately because they can be calculated as the average of the 3 sections

#### sentence_bert_test_results
- Clear column names: `similarity_score` (average of sections, same as METEOR)
- Section-level scores: `given_score`, `when_score`, `then_score` (calculated independently per section)
- JSONB `details` column for complex data (embeddings, dot products, magnitudes, full_text_similarity)
- Proper indexes for performance
- **Important**: Overall score is now calculated as the average of sections (same as METEOR) for fair comparison. The full text similarity is still stored in `details.full_text_similarity` for reference.

### How to Run

#### Option 1: Using Node.js Script (Recommended for Development)

```bash
cd aplikasi-server
node scripts/run-migration.js
```

#### Option 2: Manual SQL Execution (Recommended for Production)

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `002_separate_test_tables.sql`
4. Paste and execute

### After Migration

1. **Test the new structure**: Run a dual test and verify data is saved correctly
2. **Check the data**: Query both new tables to ensure data is being saved
3. **Monitor logs**: Check backend logs for any errors

### Rollback (if needed)

If you need to rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS meteor_test_results CASCADE;
DROP TABLE IF EXISTS sentence_bert_test_results CASCADE;

-- The old test_results table is still present and can be used
```

### Data Migration (Optional)

If you want to migrate existing data from `test_results` to the new tables, you can run:

```sql
-- Migrate METEOR results
INSERT INTO meteor_test_results (
  user_id, scenario_id, meteor_score, precision, recall, f_mean, penalty, chunks, matches,
  generated_text, reference_text, created_at
)
SELECT 
  user_id, scenario_id, score,
  (test_details->>'precision')::decimal,
  (test_details->>'recall')::decimal,
  (test_details->>'f_mean')::decimal,
  (test_details->>'penalty')::decimal,
  (test_details->>'chunks')::integer,
  (test_details->>'matches')::integer,
  generated_text, reference_text, created_at
FROM test_results
WHERE test_type = 'meteor';

-- Migrate Sentence-BERT results
INSERT INTO sentence_bert_test_results (
  user_id, scenario_id, similarity_score, cosine_similarity, semantic_distance,
  generated_text, reference_text, created_at
)
SELECT 
  user_id, scenario_id, score,
  (test_details->>'cosine_similarity')::decimal,
  (test_details->>'semantic_distance')::decimal,
  generated_text, reference_text, created_at
FROM test_results
WHERE test_type = 'sentence_bert';
```

**Note**: Section-level metrics from old data cannot be migrated because they were not stored in the old structure.

### Verification

After migration, verify the tables exist:

```sql
-- Check meteor_test_results
SELECT COUNT(*) FROM meteor_test_results;

-- Check sentence_bert_test_results
SELECT COUNT(*) FROM sentence_bert_test_results;

-- Check table structure
\d meteor_test_results
\d sentence_bert_test_results
```

### Backend Changes

The following backend files were updated to use the new tables:
- `src/services/testingService.js` - Added `saveMeteorResult()` and `saveSentenceBertResult()`
- `src/services/testingService.js` - Updated `getTestResultsByScenario()` to query new tables
- `src/controllers/testingController.js` - Updated `getTestResults()` to handle new format

### Frontend Compatibility

The frontend code remains compatible because:
- The service layer transforms the new table structure back to the expected format
- The `test_details` structure is reconstructed from individual columns
- Section metrics are properly nested in the response

### Performance Benefits

1. **Faster queries**: Direct column access instead of JSONB extraction
2. **Better indexes**: Specific indexes on score columns
3. **Clearer schema**: Self-documenting column names
4. **Type safety**: Proper column types instead of JSONB

### Monitoring

After migration, monitor:
- Backend logs for save operations
- Database query performance
- Frontend console for any parsing errors
- Test result display in UI

## Future Migrations

Future migrations should follow this naming convention:
- `003_description.sql`
- `004_description.sql`
- etc.
