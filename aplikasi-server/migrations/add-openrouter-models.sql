-- ============================================================================
-- Migration: Add OpenRouter Models
-- Description: Add 4 cost-effective models from OpenRouter
-- Date: 2026-05-03
-- ============================================================================

-- Add OpenRouter models to the models table
-- OpenRouter provides access to 300+ models through a single API
-- Benefits: No rate limits, competitive pricing, easy switching between models

-- All models use 'economy' tier since we're not enforcing tier-based limits
-- Users can choose any model based on their needs

INSERT INTO models (name, display_name, provider, tier_id) VALUES
  -- Llama 3.3 70B (FREE)
  -- Cost: $0 (completely free!)
  -- Quality: Very good, open-source
  -- Speed: Fast
  -- Use case: Development, testing, budget-conscious production
  ('meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'economy')),
  
  -- Gemini 2.5 Flash
  -- Cost: $0.30/1M input, $1.20/1M output (~$0.75/1M avg)
  -- Quality: Excellent (best value for money!)
  -- Speed: Very fast
  -- Use case: Production-ready, general purpose
  ('google/gemini-2.5-flash', 'Gemini 2.5 Flash (OpenRouter)', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'economy')),
  
  -- GPT-4.1 Mini
  -- Cost: $0.15/1M input, $0.60/1M output (~$0.38/1M avg)
  -- Quality: Very good
  -- Speed: Very fast
  -- Use case: Cost-effective production, high-volume
  ('openai/gpt-4.1-mini', 'GPT-4.1 Mini', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'economy')),
  
  -- Claude 4.5 Haiku
  -- Cost: $1/1M input, $5/1M output (~$3/1M avg)
  -- Quality: Excellent (fastest Claude)
  -- Speed: Very fast
  -- Use case: High-quality production, complex tasks
  ('anthropic/claude-haiku-4.5', 'Claude 4.5 Haiku', 'openrouter',
    (SELECT id FROM model_tiers WHERE name = 'standard'))

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
