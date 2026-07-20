-- =====================================================
-- Migration: Cleanup Old Model References
-- =====================================================
-- Purpose: Remove references to old/deprecated models from Groq
-- Date: 2026-05-24
-- Author: System Migration
--
-- IMPORTANT: This migration ONLY removes old Groq models:
-- - llama-3.1-8b-instant (Groq)
-- - llama-3.1-70b-versatile (Groq)
--
-- It does NOT touch Gemini models because:
-- - Old Gemini: gemini-flash-1.5, gemini-pro-1.5 (direct Gemini API)
-- - New Gemini: google/gemini-2.5-flash (OpenRouter)
-- - Different names = no conflict!
--
-- This migration cleans up:
-- 1. Old Groq model entries
-- 2. Usage counters for deprecated Groq models
-- =====================================================

BEGIN;

-- Step 1: List models to be removed
DO $$
DECLARE
  old_models TEXT[] := ARRAY[
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile'
  ];
  model_name TEXT;
BEGIN
  RAISE NOTICE '=== Cleaning up old Groq model references ===';
  
  FOREACH model_name IN ARRAY old_models
  LOOP
    RAISE NOTICE 'Processing model: %', model_name;
  END LOOP;
END $$;

-- Step 2: Delete usage counters for old Groq models
DELETE FROM usage_counters
WHERE model_id IN (
  SELECT id FROM models 
  WHERE name IN (
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile'
  )
  AND provider = 'groq'
);

-- Step 3: Mark old Groq models as inactive instead of deleting
-- (preserve referential integrity for historical data)
UPDATE models
SET 
  is_active = false,
  updated_at = NOW()
WHERE name IN (
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile'
)
AND provider = 'groq';

-- Step 5: Verify cleanup
DO $$
DECLARE
  inactive_count INTEGER;
  counter_count INTEGER;
  active_count INTEGER;
BEGIN
  -- Count inactive Groq models
  SELECT COUNT(*) INTO inactive_count
  FROM models
  WHERE is_active = false AND provider = 'groq';
  
  -- Count remaining counters for inactive Groq models
  SELECT COUNT(*) INTO counter_count
  FROM usage_counters uc
  JOIN models m ON uc.model_id = m.id
  WHERE m.is_active = false AND m.provider = 'groq';
  
  -- Count active OpenRouter models
  SELECT COUNT(*) INTO active_count
  FROM models
  WHERE is_active = true AND provider = 'openrouter';
  
  RAISE NOTICE '=== Cleanup Summary ===';
  RAISE NOTICE 'Inactive Groq models: %', inactive_count;
  RAISE NOTICE 'Active OpenRouter models: %', active_count;
  RAISE NOTICE 'Remaining counters for inactive models: %', counter_count;
  
  IF counter_count > 0 THEN
    RAISE WARNING 'Found % usage counters still referencing inactive models', counter_count;
  ELSE
    RAISE NOTICE '✅ All usage counters cleaned up successfully';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- Verification Queries (run separately to check)
-- =====================================================

-- Check inactive Groq models
-- SELECT id, name, display_name, provider, is_active, updated_at
-- FROM models
-- WHERE is_active = false AND provider = 'groq'
-- ORDER BY updated_at DESC;

-- Check active OpenRouter models (should include new Gemini)
-- SELECT id, name, display_name, provider, daily_limit, is_active
-- FROM models
-- WHERE is_active = true AND provider = 'openrouter'
-- ORDER BY daily_limit DESC;

-- Verify Gemini models are NOT affected
-- SELECT id, name, display_name, provider, is_active
-- FROM models
-- WHERE name LIKE '%gemini%'
-- ORDER BY name;

-- Check if any users still have counters for old Groq models
-- SELECT 
--   u.email,
--   m.name as model_name,
--   m.provider,
--   uc.current_count,
--   uc.last_reset_at
-- FROM usage_counters uc
-- JOIN models m ON uc.model_id = m.id
-- JOIN auth.users u ON uc.user_id = u.id
-- WHERE m.is_active = false AND m.provider = 'groq';
