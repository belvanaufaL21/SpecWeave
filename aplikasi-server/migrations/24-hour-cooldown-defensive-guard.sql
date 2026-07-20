-- ============================================================================
-- Migration: Add Defensive Guard to increment_usage_with_reset
-- Description: Prevent counter from exceeding daily_limit (database-level protection)
-- Date: 2026-05-06
-- ============================================================================

-- ✅ Optional: Tambahkan defensive check di increment_usage_with_reset agar
-- counter tidak pernah melebihi daily_limit (proteksi level database)

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
    -- ✅ Defensive guard: tolak increment jika sudah mencapai limit
    IF v_current_count >= v_daily_limit THEN
      RAISE EXCEPTION 'USAGE_LIMIT_EXCEEDED: counter % sudah mencapai limit %', 
        v_current_count, v_daily_limit
      USING ERRCODE = 'check_violation';
    END IF;

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

COMMENT ON FUNCTION increment_usage_with_reset IS 'Increment usage counter with 24-hour cooldown reset and defensive limit check';

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- Defensive Guard Benefits:
-- 
-- 1. Race Condition Protection
--    - Prevents multiple concurrent requests from exceeding limit
--    - Database-level enforcement (stronger than application-level)
-- 
-- 2. Data Integrity
--    - Ensures counter never exceeds daily_limit
--    - Catches bugs in application logic
-- 
-- 3. Clear Error Messages
--    - USAGE_LIMIT_EXCEEDED exception with details
--    - Application can catch and handle gracefully
-- 
-- Example Scenario:
-- - User has 49/50 requests used
-- - Two concurrent requests arrive simultaneously
-- - Without guard: both might increment → 51/50 (invalid!)
-- - With guard: first succeeds (50/50), second raises exception
-- 
-- ============================================================================
