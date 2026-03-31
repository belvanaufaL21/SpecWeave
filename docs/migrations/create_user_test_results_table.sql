-- Migration: Create user_test_results table
-- This table stores test results for user scenarios with proper constraints

BEGIN;

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS user_test_results CASCADE;

-- Create user_test_results table
CREATE TABLE user_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scenario_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  scenario_index INTEGER NOT NULL,
  meteor_score DECIMAL(5,3) NOT NULL DEFAULT 0,
  test_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique test result per scenario per user
  -- This allows upsert operations to work correctly
  CONSTRAINT unique_user_scenario UNIQUE(user_id, scenario_id)
);

-- Enable Row Level Security
ALTER TABLE user_test_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own test results" ON user_test_results;
DROP POLICY IF EXISTS "Users can insert own test results" ON user_test_results;
DROP POLICY IF EXISTS "Users can update own test results" ON user_test_results;
DROP POLICY IF EXISTS "Users can delete own test results" ON user_test_results;

-- Create RLS policies
CREATE POLICY "Users can view own test results" ON user_test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results" ON user_test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results" ON user_test_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own test results" ON user_test_results
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_user_test_results_user_id ON user_test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_scenario_id ON user_test_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_message_id ON user_test_results(message_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_user_scenario ON user_test_results(user_id, scenario_id);
CREATE INDEX IF NOT EXISTS idx_user_test_results_created_at ON user_test_results(created_at DESC);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_test_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_user_test_results_updated_at ON user_test_results;
CREATE TRIGGER update_user_test_results_updated_at 
    BEFORE UPDATE ON user_test_results
    FOR EACH ROW EXECUTE FUNCTION update_user_test_results_updated_at();

-- Add table comments
COMMENT ON TABLE user_test_results IS 'Stores test results for user scenarios with METEOR scores';
COMMENT ON COLUMN user_test_results.scenario_id IS 'Unique identifier for the scenario (messageId-scenarioIndex)';
COMMENT ON COLUMN user_test_results.message_id IS 'Message ID from chat history';
COMMENT ON COLUMN user_test_results.scenario_index IS 'Index of scenario within the message';
COMMENT ON COLUMN user_test_results.meteor_score IS 'METEOR test score (0.000-1.000)';
COMMENT ON COLUMN user_test_results.test_data IS 'Complete test data including generated text, reference text, and details';

COMMIT;

-- Verification
SELECT 'user_test_results table created successfully!' as result;

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_test_results' 
ORDER BY ordinal_position;
