-- Create error_logs table for comprehensive error tracking
-- This table stores all application errors for monitoring and analysis

CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    
    -- Error details
    error_name VARCHAR(100),
    error_message TEXT,
    error_stack TEXT,
    error_code VARCHAR(50),
    status_code INTEGER,
    
    -- Classification
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    is_operational BOOLEAN DEFAULT false,
    
    -- Request context
    request_data JSONB,
    user_data JSONB,
    session_data JSONB,
    context_data JSONB,
    
    -- Categorization
    tags TEXT[],
    environment VARCHAR(20) DEFAULT 'production',
    
    -- Indexing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_name ON error_logs(error_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_status_code ON error_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment ON error_logs(environment);
CREATE INDEX IF NOT EXISTS idx_error_logs_tags ON error_logs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_data ON error_logs USING GIN(user_data);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_level_timestamp ON error_logs(level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity_timestamp ON error_logs(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment_timestamp ON error_logs(environment, timestamp DESC);

-- Create partial indexes for operational errors
CREATE INDEX IF NOT EXISTS idx_error_logs_operational ON error_logs(timestamp DESC) 
WHERE is_operational = true;

-- Create partial indexes for critical errors
CREATE INDEX IF NOT EXISTS idx_error_logs_critical ON error_logs(timestamp DESC) 
WHERE severity = 'critical';

-- Add RLS (Row Level Security) policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service accounts (full access)
CREATE POLICY "Service accounts can manage error logs" ON error_logs
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Policy for authenticated users (read their own errors)
CREATE POLICY "Users can read their own error logs" ON error_logs
    FOR SELECT USING (
        auth.uid()::text = (user_data ->> 'id')
    );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_error_logs_updated_at
    BEFORE UPDATE ON error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_error_logs_updated_at();

-- Create function for error log cleanup
CREATE OR REPLACE FUNCTION cleanup_old_error_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get error statistics
CREATE OR REPLACE FUNCTION get_error_stats(
    time_window INTERVAL DEFAULT INTERVAL '24 hours',
    environment_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    total_errors BIGINT,
    critical_errors BIGINT,
    high_errors BIGINT,
    medium_errors BIGINT,
    low_errors BIGINT,
    error_rate NUMERIC,
    top_errors JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH error_counts AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical,
            COUNT(*) FILTER (WHERE severity = 'high') as high,
            COUNT(*) FILTER (WHERE severity = 'medium') as medium,
            COUNT(*) FILTER (WHERE severity = 'low') as low
        FROM error_logs 
        WHERE 
            timestamp >= NOW() - time_window
            AND (environment_filter IS NULL OR environment = environment_filter)
    ),
    top_error_names AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'error_name', error_name,
                    'count', error_count
                ) ORDER BY error_count DESC
            ) as top_errors
        FROM (
            SELECT 
                error_name,
                COUNT(*) as error_count
            FROM error_logs 
            WHERE 
                timestamp >= NOW() - time_window
                AND (environment_filter IS NULL OR environment = environment_filter)
            GROUP BY error_name
            ORDER BY COUNT(*) DESC
            LIMIT 10
        ) t
    )
    SELECT 
        ec.total,
        ec.critical,
        ec.high,
        ec.medium,
        ec.low,
        CASE 
            WHEN EXTRACT(EPOCH FROM time_window) > 0 
            THEN ec.total::NUMERIC / (EXTRACT(EPOCH FROM time_window) / 3600)
            ELSE 0
        END as error_rate,
        COALESCE(ten.top_errors, '[]'::jsonb)
    FROM error_counts ec
    CROSS JOIN top_error_names ten;
END;
$$ LANGUAGE plpgsql;

-- Create view for recent errors
CREATE OR REPLACE VIEW recent_error_logs AS
SELECT 
    id,
    timestamp,
    level,
    severity,
    error_name,
    error_message,
    status_code,
    is_operational,
    tags,
    environment,
    user_data ->> 'id' as user_id,
    request_data ->> 'method' as request_method,
    request_data ->> 'path' as request_path
FROM error_logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON error_logs TO authenticated;
GRANT SELECT ON recent_error_logs TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_error_logs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_error_stats(INTERVAL, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE error_logs IS 'Comprehensive error logging table for application monitoring';
COMMENT ON COLUMN error_logs.level IS 'Log level: error, warn, info, debug';
COMMENT ON COLUMN error_logs.severity IS 'Error severity: critical, high, medium, low';
COMMENT ON COLUMN error_logs.is_operational IS 'Whether this is an operational error (expected) or a bug';
COMMENT ON COLUMN error_logs.request_data IS 'HTTP request context when error occurred';
COMMENT ON COLUMN error_logs.user_data IS 'User context when error occurred';
COMMENT ON COLUMN error_logs.context_data IS 'Additional context data';
COMMENT ON COLUMN error_logs.tags IS 'Array of tags for categorization';
COMMENT ON FUNCTION cleanup_old_error_logs IS 'Function to clean up error logs older than specified days';
COMMENT ON FUNCTION get_error_stats IS 'Function to get error statistics for a time window';
COMMENT ON VIEW recent_error_logs IS 'View showing recent errors with simplified columns';