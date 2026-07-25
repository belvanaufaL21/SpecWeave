-- ============================================================
-- MIGRATION: Update default reference templates with user stories
-- PURPOSE: Add user story field to existing default templates for better few-shot prompting
-- DATE: 2026-07-21
-- ============================================================

-- Update "Absensi Harian" template
UPDATE scenario_references 
SET user_story = 'Sebagai user, saya ingin melihat absensi harian agen agar saya tahu siapa yang aktif bekerja dan siapa yang absen setiap hari'
WHERE title = 'Absensi Harian' 
  AND user_id IS NULL;  -- Only update templates (default references)

-- Update "Agent Route Summary" template
UPDATE scenario_references 
SET user_story = 'Sebagai user, saya ingin melihat ringkasan rute harian agar dapat mengevaluasi efisiensi perjalanan dan distribusi tugas di lapangan'
WHERE title = 'Agent Route Summary' 
  AND user_id IS NULL;  -- Only update templates (default references)

-- Verify the updates
SELECT 
  id,
  title,
  LEFT(user_story, 50) || '...' as user_story_preview,
  CASE 
    WHEN user_story IS NOT NULL THEN '✓ Updated'
    ELSE '✗ Missing'
  END as status
FROM scenario_references
WHERE user_id IS NULL
ORDER BY title;

-- Summary
SELECT 
  'Migration completed' as status,
  COUNT(*) as total_templates,
  COUNT(user_story) as templates_with_user_story,
  COUNT(*) - COUNT(user_story) as templates_without_user_story
FROM scenario_references
WHERE user_id IS NULL;
