-- ============================================================================
-- Migration: Redesign to Simple Limit System with Daily Reset
-- Description: Remove tier system, add per-model daily limits
-- Date: 2026-05-03
-- ============================================================================

-- Step 1: Add daily_limit column to models table
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 50;

-- Add comment to explain the column
COMMENT ON COLUMN models.daily_limit IS 'Daily request limit per user for this model. Resets at midnight UTC.';

-- Step 2: Update existing models with appropriate daily limits
-- Groq models (existing)
UPDATE models SET daily_limit = 999999 WHERE name = 'llama-3.1-8b-instant'; -- Unlimited (free)

-- Gemini models (existing)
UPDATE models SET daily_limit = 50 WHERE name = 'gemini-2.5-flash'; -- Good balance
UPDATE models SET daily_limit = 10 WHERE name = 'gemini-2.5-pro'; -- Premium, lower limit

-- OpenRouter models (new)
UPDATE models SET daily_limit = 999999 WHERE name = 'meta-llama/llama-3.3-70b-instruct'; -- FREE, unlimited
UPDATE models SET daily_limit = 50 WHERE name = 'google/gemini-2.5-flash'; -- Good balance
UPDATE models SET daily_limit = 30 WHERE name = 'openai/gpt-4.1-mini'; -- Cheaper, more usage
UPDATE models SET daily_limit = 20 WHERE name = 'anthropic/claude-haiku-4.5'; -- Premium quality

-- Step 3: Add last_reset_at column to usage_counters for daily reset tracking
ALTER TABLE usage_counters 
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add comment
COMMENT ON COLUMN usage_counters.last_reset_at IS 'Last time the counter was reset. Used for daily limit reset.';

-- Step 4: Create function to check if counter needs reset (daily)
CREATE OR REPLACE FUNCTION should_reset_daily_counter(last_reset TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  -- Reset if last_reset is from a different day (UTC)
  RETURN DATE(last_reset AT TIME ZONE 'UTC') < DATE(NOW() AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create function to get user's remaining requests for a model
CREATE OR REPLACE FUNCTION get_remaining_requests(
  p_user_id UUID,
  p_model_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_daily_limit INTEGER;
  v_current_count INTEGER;
  v_last_reset TIMESTAMPTZ;
  v_needs_reset BOOLEAN;
BEGIN
  -- Get model's daily limit
  SELECT daily_limit INTO v_daily_limit
  FROM models
  WHERE id = p_model_id;
  
  -- Get user's current count and last reset
  SELECT request_count, last_reset_at INTO v_current_count, v_last_reset
  FROM usage_counters
  WHERE user_id = p_user_id AND model_id = p_model_id;
  
  -- If no counter exists, return full limit
  IF v_current_count IS NULL THEN
    RETURN v_daily_limit;
  END IF;
  
  -- Check if counter needs reset
  v_needs_reset := should_reset_daily_counter(v_last_reset);
  
  -- If needs reset, return full limit
  IF v_needs_reset THEN
    RETURN v_daily_limit;
  END IF;
  
  -- Return remaining requests
  RETURN GREATEST(0, v_daily_limit - v_current_count);
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to increment counter with auto-reset
CREATE OR REPLACE FUNCTION increment_usage_with_reset(
  p_user_id UUID,
  p_model_id UUID
)
RETURNS TABLE(new_count INTEGER, remaining INTEGER, was_reset BOOLEAN) AS $$
DECLARE
  v_daily_limit INTEGER;
  v_current_count INTEGER;
  v_last_reset TIMESTAMPTZ;
  v_needs_reset BOOLEAN;
  v_new_count INTEGER;
BEGIN
  -- Get model's daily limit
  SELECT daily_limit INTO v_daily_limit
  FROM models
  WHERE id = p_model_id;
  
  -- Get or create counter
  INSERT INTO usage_counters (user_id, model_id, request_count, last_reset_at)
  VALUES (p_user_id, p_model_id, 0, NOW())
  ON CONFLICT (user_id, model_id) DO NOTHING;
  
  -- Get current counter
  SELECT request_count, last_reset_at INTO v_current_count, v_last_reset
  FROM usage_counters
  WHERE user_id = p_user_id AND model_id = p_model_id;
  
  -- Check if needs reset
  v_needs_reset := should_reset_daily_counter(v_last_reset);
  
  -- Reset or increment
  IF v_needs_reset THEN
    -- Reset counter to 1 (this request)
    UPDATE usage_counters
    SET request_count = 1, last_reset_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND model_id = p_model_id;
    
    v_new_count := 1;
  ELSE
    -- Increment counter
    UPDATE usage_counters
    SET request_count = request_count + 1, updated_at = NOW()
    WHERE user_id = p_user_id AND model_id = p_model_id;
    
    v_new_count := v_current_count + 1;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT 
    v_new_count,
    GREATEST(0, v_daily_limit - v_new_count),
    v_needs_reset;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create view for easy monitoring
CREATE OR REPLACE VIEW user_model_usage AS
SELECT 
  u.id as user_id,
  u.email,
  m.id as model_id,
  m.name as model_name,
  m.display_name,
  m.daily_limit,
  COALESCE(uc.request_count, 0) as current_count,
  GREATEST(0, m.daily_limit - COALESCE(uc.request_count, 0)) as remaining,
  uc.last_reset_at,
  CASE 
    WHEN uc.last_reset_at IS NULL THEN true
    WHEN should_reset_daily_counter(uc.last_reset_at) THEN true
    ELSE false
  END as needs_reset
FROM auth.users u
CROSS JOIN models m
LEFT JOIN usage_counters uc ON u.id = uc.user_id AND m.id = uc.model_id
WHERE m.is_active = true;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- New System Benefits:
-- 1. No tier system - simpler for users
-- 2. Each model has its own daily limit
-- 3. Auto-reset at midnight UTC
-- 4. Fair usage for all users
-- 5. Easy to adjust limits per model
--
-- Daily Limits:
-- - Llama 3.1 8B: 999999 (unlimited, free)
-- - Llama 3.3 70B: 999999 (unlimited, free)
-- - Gemini 2.5 Flash: 50/day (good balance)
-- - Gemini 2.5 Pro: 10/day (premium, lower limit)
-- - GPT-4.1 Mini: 30/day (cheaper, more usage)
-- - Claude 4.5 Haiku: 20/day (premium quality)
--
-- Usage:
-- - Check remaining: SELECT get_remaining_requests(user_id, model_id);
-- - Increment: SELECT * FROM increment_usage_with_reset(user_id, model_id);
-- - Monitor: SELECT * FROM user_model_usage WHERE user_id = 'xxx';
--
-- ============================================================================
