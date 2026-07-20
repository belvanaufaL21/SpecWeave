-- ============================================================================
-- Migration: Add OpenRouter Tier
-- Description: Create a new tier for OpenRouter models with high limit
-- Date: 2026-05-03
-- ============================================================================

-- Create OpenRouter tier with very high limit (practically unlimited)
-- This allows all users to access OpenRouter models without strict limits
INSERT INTO model_tiers (name, request_limit, description) VALUES
  ('openrouter', 999999, 'OpenRouter models - High limit for all users. Includes free and paid models from multiple providers.')
ON CONFLICT (name) DO UPDATE SET
  request_limit = 999999,
  description = 'OpenRouter models - High limit for all users. Includes free and paid models from multiple providers.';

-- Update OpenRouter models to use the new tier
UPDATE models 
SET tier_id = (SELECT id FROM model_tiers WHERE name = 'openrouter')
WHERE provider = 'openrouter';

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- OpenRouter Tier:
-- - request_limit: 999999 (practically unlimited)
-- - All OpenRouter models use this tier
-- - No distinction between free/paid models in terms of limits
-- - Users can choose any model based on their needs
--
-- This approach:
-- - Maintains database integrity (tier_id NOT NULL)
-- - Provides high limit for all users
-- - Simplifies model selection (no tier restrictions)
-- - Allows future flexibility if needed
--
-- ============================================================================
