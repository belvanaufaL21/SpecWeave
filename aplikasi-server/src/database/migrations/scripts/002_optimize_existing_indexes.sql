-- Migration: Optimize existing database indexes for better performance
-- This migration adds optimized indexes based on query patterns analysis
-- Requirements: 6.1, 6.2, 6.4

-- =====================================================
-- PERFORMANCE INDEXES FOR TEST_RESULTS TABLE
-- =====================================================

-- Drop existing basic indexes if they exist (to replace with optimized ones)
DROP INDEX IF EXISTS idx_test_results_user_id;
DROP INDEX IF EXISTS idx_test_results_scenario_id;
DROP INDEX IF EXISTS idx_test_results_test_type;
DROP INDEX IF EXISTS idx_test_results_created_at;

-- Composite index for user-specific queries with test type filtering
CREATE INDEX IF NOT EXISTS idx_test_results_user_type_created 
ON test_results(user_id, test_type, created_at DESC);

-- Index for scenario-based queries with score filtering
CREATE INDEX IF NOT EXISTS idx_test_results_scenario_score 
ON test_results(scenario_id, score DESC);

-- Partial index for high-scoring results (score >= 0.7)
CREATE INDEX IF NOT EXISTS idx_test_results_high_scores 
ON test_results(user_id, score DESC, created_at DESC) 
WHERE score >= 0.7;

-- Index for text search on generated and reference text
CREATE INDEX IF NOT EXISTS idx_test_results_text_search 
ON test_results USING gin(to_tsvector('english', generated_text || ' ' || reference_text));

-- Index for JSONB test_details queries
CREATE INDEX IF NOT EXISTS idx_test_results_details_gin 
ON test_results USING gin(test_details);

-- Covering index for common SELECT queries
CREATE INDEX IF NOT EXISTS idx_test_results_covering 
ON test_results(user_id, scenario_id) 
INCLUDE (test_type, score, created_at);

-- =====================================================
-- PERFORMANCE INDEXES FOR SCENARIO_REFERENCES TABLE
-- =====================================================

-- Drop existing basic indexes if they exist
DROP INDEX IF EXISTS idx_scenario_references_user_id;
DROP INDEX IF EXISTS idx_scenario_references_created_at;
DROP INDEX IF EXISTS idx_scenario_references_usage_count;

-- Composite index for user queries with usage count ordering
CREATE INDEX IF NOT EXISTS idx_scenario_references_user_usage 
ON scenario_references(user_id, usage_count DESC, created_at DESC);

-- Partial index for frequently used references (usage_count >= 5)
CREATE INDEX IF NOT EXISTS idx_scenario_references_popular 
ON scenario_references(user_id, usage_count DESC) 
WHERE usage_count >= 5;

-- Index for description text search
CREATE INDEX IF NOT EXISTS idx_scenario_references_description_search 
ON scenario_references USING gin(to_tsvector('english', COALESCE(description, '')))
WHERE description IS NOT NULL;

-- =====================================================
-- PERFORMANCE INDEXES FOR TEST_SCENARIO_REFERENCES TABLE
-- =====================================================

-- Drop existing basic indexes if they exist
DROP INDEX IF EXISTS idx_test_scenario_references_user_id;
DROP INDEX IF EXISTS idx_test_scenario_references_created_at;
DROP INDEX IF EXISTS idx_test_scenario_references_usage_count;

-- Composite index for user queries with usage ordering
CREATE INDEX IF NOT EXISTS idx_test_scenario_refs_user_usage 
ON test_scenario_references(user_id, usage_count DESC, created_at DESC);

-- Index for tag-based filtering with user context
CREATE INDEX IF NOT EXISTS idx_test_scenario_refs_user_tags 
ON test_scenario_references(user_id) 
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- Partial index for active references (usage_count > 0)
CREATE INDEX IF NOT EXISTS idx_test_scenario_refs_active 
ON test_scenario_references(user_id, created_at DESC) 
WHERE usage_count > 0;

-- =====================================================
-- PERFORMANCE INDEXES FOR PROFILES TABLE
-- =====================================================

-- Index for profile queries by email (if not already exists)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email) WHERE email IS NOT NULL;

-- Index for profile queries by updated_at for sync operations
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at 
ON profiles(updated_at DESC) WHERE updated_at IS NOT NULL;

-- Index for active profiles
CREATE INDEX IF NOT EXISTS idx_profiles_active 
ON profiles(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '1 year';

-- =====================================================
-- PERFORMANCE INDEXES FOR ERROR_LOGS TABLE (if exists)
-- =====================================================

-- Check if error_logs table exists before creating indexes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'error_logs'
  ) THEN
    -- Index for error log queries by timestamp and severity
    CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp_severity 
    ON error_logs(created_at DESC, severity) WHERE created_at IS NOT NULL;

    -- Index for error log queries by user and error type
    CREATE INDEX IF NOT EXISTS idx_error_logs_user_type 
    ON error_logs(user_id, error_type, created_at DESC) WHERE user_id IS NOT NULL;

    -- Partial index for recent errors (last 30 days)
    CREATE INDEX IF NOT EXISTS idx_error_logs_recent 
    ON error_logs(created_at DESC, severity) 
    WHERE created_at > NOW() - INTERVAL '30 days';
  END IF;
END $$;

-- =====================================================
-- QUERY OPTIMIZATION VIEWS
-- =====================================================

-- View for user test statistics with optimized aggregation
CREATE OR REPLACE VIEW user_test_statistics AS
SELECT 
    user_id,
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE test_type = 'meteor') as meteor_tests,
    COUNT(*) FILTER (WHERE test_type = 'sentence_bert') as sentence_bert_tests,
    ROUND(AVG(score) FILTER (WHERE test_type = 'meteor'), 3) as avg_meteor_score,
    ROUND(AVG(score) FILTER (WHERE test_type = 'sentence_bert'), 3) as avg_sentence_bert_score,
    ROUND(MAX(score) FILTER (WHERE test_type = 'meteor'), 3) as max_meteor_score,
    ROUND(MAX(score) FILTER (WHERE test_type = 'sentence_bert'), 3) as max_sentence_bert_score,
    ROUND(MIN(score) FILTER (WHERE test_type = 'meteor'), 3) as min_meteor_score,
    ROUND(MIN(score) FILTER (WHERE test_type = 'sentence_bert'), 3) as min_sentence_bert_score,
    MAX(created_at) as last_test_date,
    COUNT(*) FILTER (WHERE score >= 0.7) as high_score_tests,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_tests
FROM test_results
GROUP BY user_id;

-- View for scenario performance analysis
CREATE OR REPLACE VIEW scenario_performance_analysis AS
SELECT 
    scenario_id,
    COUNT(*) as total_tests,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(AVG(score), 3) as avg_score,
    ROUND(STDDEV(score), 3) as score_stddev,
    ROUND(MIN(score), 3) as min_score,
    ROUND(MAX(score), 3) as max_score,
    COUNT(*) FILTER (WHERE test_type = 'meteor') as meteor_tests,
    COUNT(*) FILTER (WHERE test_type = 'sentence_bert') as sentence_bert_tests,
    MAX(created_at) as last_test_date,
    COUNT(*) FILTER (WHERE score >= 0.8) as excellent_scores,
    COUNT(*) FILTER (WHERE score >= 0.6) as good_scores,
    COUNT(*) FILTER (WHERE score < 0.4) as poor_scores
FROM test_results
GROUP BY scenario_id;

-- View for daily test activity
CREATE OR REPLACE VIEW daily_test_activity AS
SELECT 
    DATE(created_at) as test_date,
    COUNT(*) as total_tests,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT scenario_id) as unique_scenarios,
    COUNT(*) FILTER (WHERE test_type = 'meteor') as meteor_tests,
    COUNT(*) FILTER (WHERE test_type = 'sentence_bert') as sentence_bert_tests,
    ROUND(AVG(score), 3) as avg_score
FROM test_results
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY test_date DESC;

-- =====================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =====================================================

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
    table_name text,
    index_name text,
    index_size text,
    table_size text,
    index_scans bigint,
    tuples_read bigint,
    tuples_fetched bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow query recommendations
CREATE OR REPLACE FUNCTION get_optimization_recommendations()
RETURNS TABLE(
    recommendation text,
    priority text,
    table_affected text,
    estimated_impact text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Consider adding composite index on frequently queried columns' as recommendation,
        'HIGH' as priority,
        'test_results' as table_affected,
        'Significant performance improvement for user queries' as estimated_impact
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'test_results' 
        AND indexname = 'idx_test_results_user_type_created'
    )
    
    UNION ALL
    
    SELECT 
        'Consider partitioning large tables by date' as recommendation,
        'MEDIUM' as priority,
        'test_results' as table_affected,
        'Better performance for time-based queries' as estimated_impact
    WHERE (
        SELECT COUNT(*) FROM test_results
    ) > 100000
    
    UNION ALL
    
    SELECT 
        'Consider archiving old test results' as recommendation,
        'LOW' as priority,
        'test_results' as table_affected,
        'Reduced storage and improved query performance' as estimated_impact
    WHERE (
        SELECT COUNT(*) FROM test_results 
        WHERE created_at < NOW() - INTERVAL '1 year'
    ) > 10000;
END;
$$ LANGUAGE plpgsql;

-- Function to update table statistics for better query planning
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  tables_updated INTEGER := 0;
BEGIN
    -- Update statistics for main tables
    ANALYZE test_results;
    ANALYZE scenario_references;
    ANALYZE test_scenario_references;
    ANALYZE profiles;
    ANALYZE schema_migrations;
    
    tables_updated := 5;
    
    -- Update statistics for error_logs if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'error_logs'
    ) THEN
        ANALYZE error_logs;
        tables_updated := tables_updated + 1;
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'tables_updated', tables_updated,
        'updated_at', NOW(),
        'message', 'Table statistics updated successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'sqlstate', SQLSTATE
        );
        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_test_results_user_type_created IS 'Optimizes user-specific queries with test type filtering and date ordering';
COMMENT ON INDEX idx_test_results_scenario_score IS 'Optimizes scenario-based queries with score-based ordering';
COMMENT ON INDEX idx_test_results_high_scores IS 'Partial index for high-scoring results to optimize quality analysis queries';
COMMENT ON INDEX idx_test_results_text_search IS 'Full-text search index for generated and reference text content';
COMMENT ON INDEX idx_test_results_details_gin IS 'GIN index for efficient JSONB queries on test_details column';
COMMENT ON INDEX idx_test_results_covering IS 'Covering index to avoid table lookups for common queries';

COMMENT ON VIEW user_test_statistics IS 'Optimized view for user test statistics with pre-aggregated metrics';
COMMENT ON VIEW scenario_performance_analysis IS 'Optimized view for scenario performance analysis across users';
COMMENT ON VIEW daily_test_activity IS 'View for analyzing daily test activity patterns';

COMMENT ON FUNCTION analyze_index_usage() IS 'Analyzes database index usage statistics for optimization';
COMMENT ON FUNCTION get_optimization_recommendations() IS 'Provides recommendations for database optimization';
COMMENT ON FUNCTION update_table_statistics() IS 'Updates table statistics for query optimizer';