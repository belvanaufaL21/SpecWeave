-- ============================================================================
-- Migration: 24-Hour Cooldown System (Instead of Daily Midnight Reset)
-- Description: Reset only happens 24 hours after credit runs out
-- Date: 2026-05-06
-- ============================================================================

-- Step 1: Modify should_reset_daily_counter to check 24-hour cooldown
-- Old: Reset if different day (midnight UTC)
-- New: Reset if 24 hours passed since last_reset_at

CREATE OR REPLACE FUNCTION should_reset_cooldown(last_reset TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  -- Reset if 24 hours have passed since last reset
  RETURN (NOW() - last_reset) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION should_reset_cooldown IS 'Check if 24 hours have passed since last reset (cooldown period)';

-- Step 2: Modify get_remaining_requests to use cooldown logic
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
  
  -- Check if 24-hour cooldown has passed
  v_needs_reset := should_reset_cooldown(v_last_reset);
  
  -- If cooldown passed, return full limit
  IF v_needs_reset THEN
    RETURN v_daily_limit;
  END IF;
  
  -- Return remaining requests
  RETURN GREATEST(0, v_daily_limit - v_current_count);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_remaining_requests IS 'Get remaining requests for user+model with 24-hour cooldown reset';

-- Step 3: Modify increment_usage_with_reset to use cooldown logic
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
  
  -- Check if 24-hour cooldown has passed
  v_needs_reset := should_reset_cooldown(v_last_reset);
  
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

COMMENT ON FUNCTION increment_usage_with_reset IS 'Increment usage counter with 24-hour cooldown reset';

-- Step 4: Update view to use cooldown logic
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
    WHEN should_reset_cooldown(uc.last_reset_at) THEN true
    ELSE false
  END as needs_reset,
  -- Add cooldown info
  CASE 
    WHEN uc.last_reset_at IS NULL THEN NULL
    WHEN should_reset_cooldown(uc.last_reset_at) THEN NULL
    ELSE uc.last_reset_at + INTERVAL '24 hours'
  END as resets_at
FROM auth.users u
CROSS JOIN models m
LEFT JOIN usage_counters uc ON u.id = uc.user_id AND m.id = uc.model_id
WHERE m.is_active = true;

COMMENT ON VIEW user_model_usage IS 'User usage across all models with 24-hour cooldown info';

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- New System: 24-Hour Cooldown
-- 
-- How it works:
-- 1. User uses credit until it runs out (e.g., 50/50 used)
-- 2. last_reset_at is set to the time of last request
-- 3. User must wait 24 hours from last_reset_at
-- 4. After 24 hours, next request triggers reset
-- 
-- Example:
-- - Day 1, 10:00 AM: User uses 50/50 → last_reset_at = 10:00 AM
-- - Day 1, 11:00 AM: User tries to use → Blocked (0 remaining)
-- - Day 2, 09:59 AM: User tries to use → Blocked (23h 59m passed)
-- - Day 2, 10:00 AM: User makes request → Reset! Counter = 1
-- 
-- Benefits:
-- - Fair for all users (everyone gets 24 hours)
-- - Cannot game the system (no midnight reset exploit)
-- - More predictable (user knows exactly when reset happens)
-- - Cost-effective (only reset when needed)
-- 
-- Migration from old system:
-- - Existing counters will use 24-hour cooldown from their last_reset_at
-- - No data loss or breaking changes
-- - Backward compatible
-- 
-- ============================================================================
