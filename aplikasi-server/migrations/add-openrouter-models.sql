-- ============================================================================
-- Migration: Add OpenRouter Models
-- Description: Add 4 cost-effective models from OpenRouter
-- Date: 2026-05-03
-- ============================================================================

-- Step 1: Create OpenRouter tier with high limit (practically unlimited)
-- This allows all users to access OpenRouter models without strict limits
INSERT INTO model_tiers (name, request_limit, description) VALUES
  ('openrouter', 999999, 'OpenRouter models - High limit for all users. Includes free and paid models from multiple providers.')
ON CONFLICT (name) DO UPDATE SET
  request_limit = 999999,
  description = 'OpenRouter models - High limit for all users. Includes free and paid models from multiple providers.';

-- Step 2: Add OpenRouter models to the models table
-- OpenRouter provides access to 300+ models through a single API
-- Benefits: No rate limits, competitive pricing, easy switching between models

INSERT INTO models (name, display_name, provider, tier_id) VALUES
  -- Llama 3.3 70B (FREE)
  -- Cost: $0 (completely free!)
  -- Quality: Very good, open-source
  -- Speed: Fast
  -- Use case: Development, testing, budget-conscious production
  ('meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter')),
  
  -- Gemini 2.5 Flash
  -- Cost: $0.30/1M input, $1.20/1M output (~$0.75/1M avg)
  -- Quality: Excellent (best value for money!)
  -- Speed: Very fast
  -- Use case: Production-ready, general purpose
  ('google/gemini-2.5-flash', 'Gemini 2.5 Flash (OpenRouter)', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter')),
  
  -- GPT-4.1 Mini
  -- Cost: $0.15/1M input, $0.60/1M output (~$0.38/1M avg)
  -- Quality: Very good
  -- Speed: Very fast
  -- Use case: Cost-effective production, high-volume
  ('openai/gpt-4.1-mini', 'GPT-4.1 Mini', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter')),
  
  -- Claude 4.5 Haiku
  -- Cost: $1/1M input, $5/1M output (~$3/1M avg)
  -- Quality: Excellent (fastest Claude)
  -- Speed: Very fast
  -- Use case: High-quality production, complex tasks
  ('anthropic/claude-haiku-4.5', 'Claude 4.5 Haiku', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'openrouter'))

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- Model Comparison:
-- 1. Llama 3.3 70B: FREE - Best for testing & budget production
-- 2. GPT-4.1 Mini: $0.38/1M - Cheapest paid option
-- 3. Gemini 2.5 Flash: $0.75/1M - Best value for money
-- 4. Claude 4.5 Haiku: $3/1M - Highest quality
--
-- All models available through OpenRouter with:
-- - No rate limits (unlike direct API)
-- - Single API key
-- - OpenAI-compatible API
--
-- ============================================================================
