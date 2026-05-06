-- ============================================================================
-- 24-Hour Cooldown System Migration
-- Copy semua SQL di bawah ini dan paste ke Supabase SQL Editor
-- ============================================================================

-- Step 1: Create cooldown check function (24-hour check)
CREATE OR REPLACE FUNCTION should_reset_cooldown(last_reset TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  -- Reset if 24 hours have passed since last reset
  RETURN (NOW() - last_reset) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION should_reset_cooldown IS 'Check if 24 hours have passed since last reset (cooldown period)';

-- Step 2: Update get_remaining_requests to use cooldown logic
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

-- Step 3: Update increment_usage_with_reset to use cooldown logic
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

-- Step 4: Update view to include resets_at for countdown timer
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
  -- Add resets_at for countdown timer in UI
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
-- Migration Complete!
-- ============================================================================
-- 
-- What changed:
-- - Old: Reset at midnight UTC every day
-- - New: Reset 24 hours after last reset
-- 
-- Benefits:
-- ✅ Fair for all users (everyone gets 24 hours)
-- ✅ Cannot be exploited (no midnight reset trick)
-- ✅ More predictable (countdown timer in UI)
-- ✅ Cost-effective (lazy reset on-demand)
-- 
-- Next steps:
-- 1. Verify migration: SELECT * FROM user_model_usage LIMIT 1;
-- 2. Check functions: SELECT routine_name FROM information_schema.routines 
--    WHERE routine_name LIKE '%cooldown%';
-- 3. Deploy frontend changes
-- 4. Test with real user
-- 
-- ============================================================================
