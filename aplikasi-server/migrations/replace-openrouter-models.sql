-- ============================================================================
-- Migration: Replace OpenRouter Models
-- Description: Replace current models with new model selection
-- Date: 2026-06-26
-- ============================================================================

-- ============================================================================
-- PART 1: Backup existing models (mark as inactive)
-- ============================================================================
-- Instead of deleting, we mark old models as inactive to preserve usage history

UPDATE models SET is_active = false 
WHERE name IN (
  'meta-llama/llama-3.3-70b-instruct',
  'google/gemini-2.5-flash',
  'openai/gpt-4.1-mini',
  'anthropic/claude-haiku-4.5'
);

-- ============================================================================
-- PART 2: Update tier limits
-- ============================================================================
-- Tier structure with generous limits for research/testing purposes

UPDATE model_tiers SET 
  request_limit = 999999,
  description = 'Free tier - Unlimited usage for free models (DeepSeek R1)'
WHERE name = 'openrouter';

-- Create new tiers for different cost levels
INSERT INTO model_tiers (name, request_limit, description) VALUES
  ('openrouter-economy', 50, 'Economy tier - Low-cost models (~$0.65/1M tokens) - Llama 3 70B'),
  ('openrouter-standard', 20, 'Standard tier - Mid-cost models (~$5/1M tokens) - Gemini 1.5 Pro'),
  ('openrouter-premium', 10, 'Premium tier - High-cost models (~$20/1M tokens) - GPT-4 Turbo')
ON CONFLICT (name) DO UPDATE SET
  request_limit = EXCLUDED.request_limit,
  description = EXCLUDED.description;

-- ============================================================================
-- PART 3: Add new models
-- ============================================================================

INSERT INTO models (name, display_name, provider, tier_id, is_active) VALUES
  
  -- DeepSeek R1 (FREE) - Unlimited
  -- Cost: $0 (completely free!)
  -- Quality: Flagship (setara GPT-4o/O1) - 97.3% MATH-500
  -- Speed: Medium (~30-40 tok/s karena reasoning chains)
  -- Use case: Reasoning, math, complex problem solving, research
  -- Limit: 999,999/day (practically unlimited)
  ('deepseek/deepseek-r1:free', 'DeepSeek R1 (Free)', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter'), true),
  
  -- Llama 3 70B - Economy
  -- Cost: ~$0.65/1M tokens
  -- Quality: Strong open-source (predecessor of Llama 3.3)
  -- Speed: Fast (~70 tok/s)
  -- Use case: General purpose, cost-effective production, baseline comparison
  -- Limit: 50/day
  ('meta-llama/meta-llama-3-70b-instruct', 'Llama 3 70B', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter-economy'), true),
  
  -- Gemini 1.5 Pro - Standard
  -- Cost: ~$5.25/1M tokens ($3.50 input, $7.00 output avg)
  -- Quality: Strong multimodal with 2M context window
  -- Speed: Medium (~50-60 tok/s)
  -- Use case: Long context analysis, multimodal tasks, document processing
  -- Limit: 20/day
  ('google/gemini-1.5-pro', 'Gemini 1.5 Pro', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter-standard'), true),
  
  -- GPT-4 Turbo - Premium
  -- Cost: ~$20/1M tokens ($10 input, $30 output avg)
  -- Quality: Flagship OpenAI (2023) - Complex reasoning benchmark
  -- Speed: Medium (~50 tok/s)
  -- Use case: Complex reasoning, critical analysis, research comparison
  -- Limit: 10/day
  ('openai/gpt-4-turbo', 'GPT-4 Turbo', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter-premium'), true)

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  tier_id = EXCLUDED.tier_id,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- PART 4: Reset usage counters (optional)
-- ============================================================================
-- Uncomment below if you want to reset all user usage counters
-- This gives all users fresh limits with the new models

-- DELETE FROM usage_counters;

-- Or, if you only want to remove counters for old inactive models:
DELETE FROM usage_counters 
WHERE model_id IN (
  SELECT id FROM models WHERE is_active = false
);

-- ============================================================================
-- PART 5: Verification queries
-- ============================================================================
-- Run these to verify the migration

-- Check all active models with their limits
-- SELECT 
--   m.name,
--   m.display_name,
--   m.provider,
--   mt.name as tier_name,
--   mt.request_limit,
--   m.is_active
-- FROM models m
-- JOIN model_tiers mt ON m.tier_id = mt.id
-- WHERE m.is_active = true
-- ORDER BY mt.request_limit DESC;

-- Check inactive (old) models
-- SELECT name, display_name, is_active 
-- FROM models 
-- WHERE is_active = false;

-- ============================================================================
-- Notes & Summary
-- ============================================================================
-- 
-- NEW MODEL LINEUP (Sorted by daily limit):
-- ┌──────────────────────────┬─────────────┬───────────┬─────────────┐
-- │ Model                    │ Cost/1M     │ Limit/Day │ Tier        │
-- ├──────────────────────────┼─────────────┼───────────┼─────────────┤
-- │ DeepSeek R1 (free)       │ $0          │ 999,999   │ Free        │
-- │ Llama 3 70B              │ ~$0.65      │ 50        │ Economy     │
-- │ Gemini 1.5 Pro           │ ~$5.25      │ 20        │ Standard    │
-- │ GPT-4 Turbo              │ ~$20        │ 10        │ Premium     │
-- └──────────────────────────┴─────────────┴───────────┴─────────────┘
--
-- Total Paid Requests/Day: 80 (50 + 20 + 10)
-- Total Unique Providers: 4 (DeepSeek, Meta, Google, OpenAI)
--
-- COMPARISON WITH OLD MODELS:
-- ┌──────────────────────────┬───────────────────────┬──────────────┐
-- │ OLD Model                │ NEW Model             │ Change       │
-- ├──────────────────────────┼───────────────────────┼──────────────┤
-- │ Llama 3.3 70B            │ DeepSeek R1           │ ✅ Upgrade   │
-- │ (999,999/day, FREE)      │ (999,999/day, FREE)   │ Better       │
-- │                          │                       │ reasoning    │
-- ├──────────────────────────┼───────────────────────┼──────────────┤
-- │ Gemini 2.5 Flash         │ Llama 3 70B           │ ⚠️ Sidegrade │
-- │ (50/day, $0.75)          │ (50/day, $0.65)       │ Older but    │
-- │                          │                       │ cheaper      │
-- ├──────────────────────────┼───────────────────────┼──────────────┤
-- │ GPT-4.1 Mini             │ Gemini 1.5 Pro        │ ⚠️ Trade-off │
-- │ (30/day, $0.38)          │ (20/day, $5.25)       │ More features│
-- │                          │                       │ higher cost  │
-- ├──────────────────────────┼───────────────────────┼──────────────┤
-- │ Claude 4.5 Haiku         │ GPT-4 Turbo           │ ⚠️ Trade-off │
-- │ (20/day, $3)             │ (10/day, $20)         │ Flagship but │
-- │                          │                       │ more expensive│
-- └──────────────────────────┴───────────────────────┴──────────────┘
--
-- COST ANALYSIS (per user per month, 500 tokens/req):
-- OLD Setup: ~$1.63/user/month (100 paid requests/day)
-- NEW Setup: ~$5.07/user/month (80 paid requests/day)
-- Difference: 3.1× more expensive, 20% fewer requests
--
-- USE CASES FOR NEW LINEUP:
-- ✅ Research & Academic: Compare model generations
-- ✅ Testing & Benchmarking: Evaluate different approaches
-- ✅ Education: Learn differences between model families
-- ✅ Diverse Provider Coverage: Meta, Google, OpenAI, DeepSeek
-- ✅ Long Context: Gemini 1.5 Pro (2M tokens)
-- ✅ Reasoning: DeepSeek R1 (unlimited free)
--
-- TRADE-OFFS:
-- ⚠️ Higher operational cost (3× more expensive)
-- ⚠️ Older model generations (2023-2024 vs 2025-2026)
-- ⚠️ Fewer total paid requests per day (-20%)
-- ✅ More generous premium tier limits (10 vs 2)
-- ✅ Access to GPT-4 Turbo and Gemini 1.5 Pro features
-- ✅ Better for research/comparison purposes
--
-- RECOMMENDATION:
-- This setup is GOOD for:
-- - Research projects comparing different model generations
-- - Academic use cases requiring diverse model access
-- - Testing and benchmarking scenarios
-- - Applications needing Gemini's long context (2M tokens)
-- - Budget allowing ~$5/user/month for AI costs
--
-- Consider the OLD setup if you need:
-- - Lower operational costs ($1.63 vs $5.07/month)
-- - More requests per day (100 vs 80)
-- - Latest model technology (2025-2026 generation)
-- - Better cost-to-performance ratio
--
-- ============================================================================
