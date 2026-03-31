-- Create health_check_history table for storing health check results
-- This table is used by the health check service to store historical data

CREATE TABLE IF NOT EXISTS health_check_history (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    overall_health BOOLEAN NOT NULL,
    results JSONB NOT NULL,
    critical_failures INTEGER NOT NULL DEFAULT 0,
    warning_failures INTEGER NOT NULL DEFAULT 0,
    total_checks INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_check_history_timestamp ON health_check_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_check_history_overall_health ON health_check_history(overall_health);
CREATE INDEX IF NOT EXISTS idx_health_check_history_created_at ON health_check_history(created_at);

-- Add RLS policy if needed (optional, depends on your security requirements)
-- ALTER TABLE health_check_history ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows service role to read/write
-- CREATE POLICY "Service role can manage health check history" ON health_check_history
--     FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE health_check_history IS 'Stores historical health check results for monitoring and analysis';
COMMENT ON COLUMN health_check_history.results IS 'JSON object containing detailed health check results';
COMMENT ON COLUMN health_check_history.overall_health IS 'Boolean indicating if the overall system health was good';