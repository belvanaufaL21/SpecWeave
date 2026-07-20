-- ============================================================
-- MIGRATION: Add user_story column to scenario_references
-- PURPOSE: Enable proper few-shot prompting with input-output pairs
-- DATE: 2026-07-20
-- ============================================================

-- Add user_story column to store the original user story input
-- This enables proper few-shot prompting by providing both input and output examples
ALTER TABLE scenario_references 
ADD COLUMN IF NOT EXISTS user_story TEXT;

-- Add comment to explain the column purpose
COMMENT ON COLUMN scenario_references.user_story IS 'Original user story input (Connextra format) that was used to generate the gherkin_content. Used for few-shot prompting examples.';

-- Optional: Create index for potential text search operations
CREATE INDEX IF NOT EXISTS idx_scenario_references_user_story 
ON scenario_references USING gin(to_tsvector('indonesian', user_story));

-- Display summary
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_references,
  COUNT(user_story) as references_with_user_story,
  COUNT(*) - COUNT(user_story) as references_without_user_story
FROM scenario_references;
