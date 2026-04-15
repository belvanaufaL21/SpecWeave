-- ============================================================================
-- LLM Usage Limit System Migration
-- ============================================================================
-- This migration creates the database schema for the LLM Usage Limit System
-- which enforces per-user, per-model request limits with multi-provider support.
--
-- Tables created:
-- 1. model_tiers: Defines tier categories (economy, standard, premium) with limits
-- 2. models: Stores available LLM models with provider and tier assignment
-- 3. usage_counters: Tracks per-user, per-model request counts
-- 4. usage_history: Records request history for analytics
--
-- Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 6.1, 6.2
-- ============================================================================

-- ============================================================================
-- Table 1: model_tiers
-- ============================================================================
-- Defines tier categories with their request limits
-- Economy tier: Low-cost models with highest request limit (50)
-- Standard tier: Mid-tier models with moderate request limit (10)
-- Premium tier: High-cost models with lowest request limit (1)

CREATE TABLE IF NOT EXISTS model_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  request_limit INTEGER NOT NULL CHECK (request_limit > 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed model_tiers with 3 tiers
INSERT INTO model_tiers (name, request_limit, description) VALUES
  ('economy', 50, 'Low-cost models with highest request limit'),
  ('standard', 10, 'Mid-tier models with moderate request limit'),
  ('premium', 1, 'High-cost models with lowest request limit')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Table 2: models
-- ============================================================================
-- Stores available LLM models with provider and tier assignment
-- Supports multiple providers: groq, gemini (extensible for future providers)

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  tier_id UUID NOT NULL REFERENCES model_tiers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_models_tier ON models(tier_id);
CREATE INDEX IF NOT EXISTS idx_models_active ON models(is_active);

-- Seed models table with 3 models
INSERT INTO models (name, display_name, provider, tier_id) VALUES
  ('llama-3.1-8b-instant', 'Llama 3.1 8B', 'groq',
    (SELECT id FROM model_tiers WHERE name = 'economy')),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', 'gemini',
    (SELECT id FROM model_tiers WHERE name = 'standard')),
  ('gemini-2.5-pro', 'Gemini 2.5 Pro', 'gemini',
    (SELECT id FROM model_tiers WHERE name = 'premium'))
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Table 3: usage_counters
-- ============================================================================
-- Tracks per-user, per-model request counts
-- Each user has a separate counter for each model they use

CREATE TABLE IF NOT EXISTS usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- Create indexes for performance
-- Note: UNIQUE(user_id, model_id) constraint automatically creates an index
-- that covers both user_id lookups and composite (user_id, model_id) lookups.
-- We only need an additional index for model_id-only queries.
CREATE INDEX IF NOT EXISTS idx_usage_counters_model ON usage_counters(model_id);

-- ============================================================================
-- Table 4: usage_history
-- ============================================================================
-- Records request history for analytics and auditing
-- Tracks both successful and failed requests

CREATE TABLE IF NOT EXISTS usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  request_id VARCHAR(255),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_history_user ON usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_created ON usage_history(created_at);

-- ============================================================================
-- Triggers for auto-updating updated_at columns
-- ============================================================================
-- Create a reusable function that updates the updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column

CREATE TRIGGER trg_model_tiers_updated
  BEFORE UPDATE ON model_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_models_updated
  BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_usage_counters_updated
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables created: model_tiers, models, usage_counters, usage_history
-- Seed data inserted: 3 tiers, 3 models
-- Indexes created for optimal query performance
-- Triggers created for automatic updated_at timestamp management
-- ============================================================================
