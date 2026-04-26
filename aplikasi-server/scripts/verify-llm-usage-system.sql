-- ============================================================================
-- LLM Usage Limit System Verification Script
-- ============================================================================
-- Run this script in Supabase SQL Editor to verify the system is working
-- ============================================================================

-- ============================================================================
-- 1. Check if all tables exist
-- ============================================================================
SELECT 
  'Tables Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS: All 4 tables exist'
    ELSE '❌ FAIL: Expected 4 tables, found ' || COUNT(*)
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('model_tiers', 'models', 'usage_counters', 'usage_history');

-- ============================================================================
-- 2. Check model_tiers seed data
-- ============================================================================
SELECT 
  'Model Tiers Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS: All 3 tiers exist'
    ELSE '❌ FAIL: Expected 3 tiers, found ' || COUNT(*)
  END as status
FROM model_tiers;

-- Show tier details
SELECT 
  name, 
  request_limit, 
  description
FROM model_tiers 
ORDER BY request_limit DESC;

-- ============================================================================
-- 3. Check models seed data
-- ============================================================================
SELECT 
  'Models Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS: All 3 models exist'
    ELSE '❌ FAIL: Expected 3 models, found ' || COUNT(*)
  END as status
FROM models;

-- Show model details with tier info
SELECT 
  m.name, 
  m.display_name, 
  m.provider, 
  mt.name as tier, 
  mt.request_limit,
  m.is_active
FROM models m
JOIN model_tiers mt ON m.tier_id = mt.id
ORDER BY mt.request_limit DESC;

-- ============================================================================
-- 4. Check indexes
-- ============================================================================
SELECT 
  'Indexes Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ PASS: All required indexes exist'
    ELSE '❌ FAIL: Expected at least 5 indexes, found ' || COUNT(*)
  END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'usage_counters', 'usage_history')
AND indexname LIKE 'idx_%';

-- Show index details
SELECT 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('models', 'usage_counters', 'usage_history')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- 5. Check triggers
-- ============================================================================
SELECT 
  'Triggers Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS: All required triggers exist'
    ELSE '❌ FAIL: Expected at least 3 triggers, found ' || COUNT(*)
  END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'trg_%updated';

-- Show trigger details
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'trg_%updated'
ORDER BY event_object_table;

-- ============================================================================
-- 6. Check foreign key constraints
-- ============================================================================
SELECT 
  'Foreign Keys Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS: All required foreign keys exist'
    ELSE '❌ FAIL: Expected at least 4 foreign keys, found ' || COUNT(*)
  END as status
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' 
AND constraint_type = 'FOREIGN KEY'
AND table_name IN ('models', 'usage_counters', 'usage_history');

-- Show foreign key details
SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('models', 'usage_counters', 'usage_history')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- 7. Test query: Get user usage (simulated)
-- ============================================================================
-- This simulates the query used by usageLimitService.getUserUsage()
-- Replace 'YOUR_USER_ID' with an actual user ID to test

-- First, let's get a sample user ID
SELECT 
  'Sample User ID' as info,
  id as user_id
FROM auth.users 
LIMIT 1;

-- Now test the getUserUsage query (replace the user_id below)
-- SELECT 
--   m.id,
--   m.name,
--   m.display_name,
--   m.provider,
--   mt.name as tier,
--   mt.request_limit as limit,
--   COALESCE(uc.request_count, 0) as used,
--   mt.request_limit - COALESCE(uc.request_count, 0) as remaining
-- FROM models m
-- JOIN model_tiers mt ON m.tier_id = mt.id
-- LEFT JOIN usage_counters uc ON uc.model_id = m.id AND uc.user_id = 'YOUR_USER_ID'
-- WHERE m.is_active = true
-- ORDER BY mt.request_limit DESC;

-- ============================================================================
-- 8. Summary
-- ============================================================================
SELECT 
  '============================================' as summary;
SELECT 
  'LLM Usage Limit System Verification Complete' as summary;
SELECT 
  '============================================' as summary;

-- Count total checks
WITH checks AS (
  SELECT COUNT(*) as total FROM (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('model_tiers', 'models', 'usage_counters', 'usage_history')
    HAVING COUNT(*) = 4
    
    UNION ALL
    
    SELECT 1 FROM model_tiers
    HAVING COUNT(*) = 3
    
    UNION ALL
    
    SELECT 1 FROM models
    HAVING COUNT(*) = 3
    
    UNION ALL
    
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN ('models', 'usage_counters', 'usage_history')
    AND indexname LIKE 'idx_%'
    HAVING COUNT(*) >= 5
    
    UNION ALL
    
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name LIKE 'trg_%updated'
    HAVING COUNT(*) >= 3
    
    UNION ALL
    
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('models', 'usage_counters', 'usage_history')
    HAVING COUNT(*) >= 4
  ) sub
)
SELECT 
  total || ' / 6 checks passed' as result,
  CASE 
    WHEN total = 6 THEN '✅ System is ready for production!'
    ELSE '❌ Some checks failed. Review the output above.'
  END as status
FROM checks;

-- ============================================================================
-- Next Steps
-- ============================================================================
SELECT 
  'Next Steps:' as info;
SELECT 
  '1. If all checks passed, update Railway environment variables' as step;
SELECT 
  '2. Add GEMINI_API_KEY to Railway' as step;
SELECT 
  '3. Redeploy the application' as step;
SELECT 
  '4. Test API endpoints: /api/usage/limits and /api/gherkin/generate' as step;
SELECT 
  '5. Test frontend ModelSelector UI' as step;
