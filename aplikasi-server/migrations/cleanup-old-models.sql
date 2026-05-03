-- ============================================================================
-- Migration: Cleanup Old Models
-- Description: Remove old Groq and Gemini direct models, keep only OpenRouter
-- Date: 2026-05-03
-- ============================================================================

-- Deactivate old models instead of deleting (safer, preserves history)
-- This way, existing usage_counters and usage_history remain intact

-- Step 1: Deactivate old Groq model
UPDATE models 
SET is_active = false, updated_at = NOW()
WHERE name = 'llama-3.1-8b-instant' AND provider = 'groq';

-- Step 2: Deactivate old Gemini direct models
UPDATE models 
SET is_active = false, updated_at = NOW()
WHERE provider = 'gemini' AND name IN ('gemini-2.5-flash', 'gemini-2.5-pro');

-- ============================================================================
-- Result: Only 4 OpenRouter models remain active
-- ============================================================================
-- 
-- Active Models:
-- 1. Llama 3.3 70B (OpenRouter) - FREE, unlimited
-- 2. Gemini 2.5 Flash (OpenRouter) - $0.75/1M, 50/day
-- 3. GPT-4.1 Mini (OpenRouter) - $0.38/1M, 30/day
-- 4. Claude 4.5 Haiku (OpenRouter) - $3/1M, 20/day
--
-- Deactivated Models (preserved for history):
-- - Llama 3.1 8B (Groq) - Replaced by Llama 3.3 70B
-- - Gemini 2.5 Flash (Gemini direct) - Replaced by OpenRouter version
-- - Gemini 2.5 Pro (Gemini direct) - Rate limit issues (2 req/min)
--
-- Benefits:
-- - No rate limit issues (OpenRouter has no strict limits)
-- - Consistent provider (all OpenRouter)
-- - Simpler for users (4 clear choices)
-- - Better models (Llama 3.3 > 3.1)
--
-- Note: Old usage data is preserved in usage_counters and usage_history
-- ============================================================================
