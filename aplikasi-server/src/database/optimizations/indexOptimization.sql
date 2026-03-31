-- Database Index Optimization for SpecWeave System
-- This file contains optimized indexing strategies for improved query performance
-- Requirements: 6.1, 6.2, 6.4

-- =====================================================
-- PERFORMANCE INDEXES FOR TEST_RESULTS TABLE
-- =====================================================

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

-- =====================================================
-- PERFORMANCE INDEXES FOR SCENARIO_REFERENCES TABLE
-- =====================================================

-- Composite index for user queries with usage count ordering
CREATE INDEX IF NOT EXISTS idx_scenario_references_user_usage 
ON scenario_references(user_id, usage_count DESC, created_at DESC);

-- Partial index for frequently used references (usage_count >= 5)
CREATE INDEX IF NOT EXISTS idx_scenario_references_popular 
ON scenario_references(user_id, usage_count DESC) 
WHERE usage_count >= 5;

-- =====================================================
-- PERFORMANCE INDEXES FOR TEST_SCENARIO_REFERENCES TABLE
-- =====================================================

-- Composite index for user queries with usage ordering
CREATE INDEX IF NOT EXISTS idx_test_scenario_refs_user_usage 
ON test_scenario_references(user_id, usage_count DESC, created_at DESC);

-- Index for tag-based filtering with user context
CREATE INDEX IF NOT EXISTS idx_test_scenario_refs_user_tags 
ON test_scenario_references(user_id) WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- =====================================================
-- PERFORMANCE INDEXES FOR ERROR_LOGS TABLE (if exists)
-- =====================================================

-- Index for error log queries by timestamp and severity
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp_severity 
ON error_logs(created_at DESC, severity) WHERE created_at IS NOT NULL;

-- Index for error log queries by user and error type
CREATE INDEX IF NOT EXISTS idx_error_logs_user_type 
ON error_logs(user_id, error_type, created_at DESC) WHERE user_id IS NOT NULL;

-- =====================================================
-- PERFORMANCE INDEXES FOR PROFILES TABLE
-- =====================================================

-- Index for profile queries by email (if not already exists)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email) WHERE email IS NOT NULL;

-- Index for profile queries by updated_at for sync operations
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at 
ON profiles(updated_at DESC) WHERE updated_at IS NOT NULL;

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
    AVG(score) FILTER (WHERE test_type = 'meteor') as avg_meteor_score,
    AVG(score) FILTER (WHERE test_type = 'sentence_bert') as avg_sentence_bert_score,
    MAX(score) FILTER (WHERE test_type = 'meteor') as max_meteor_score,
    MAX(score) FILTER (WHERE test_type = 'sentence_bert') as max_sentence_bert_score,
    MIN(score) FILTER (WHERE test_type = 'meteor') as min_meteor_score,
    MIN(score) FILTER (WHERE test_type = 'sentence_bert') as min_sentence_bert_score,
    MAX(created_at) as last_test_date
FROM test_results
GROUP BY user_id;

-- View for scenario performance analysis
CREATE OR REPLACE VIEW scenario_performance_analysis AS
SELECT 
    scenario_id,
    COUNT(*) as total_tests,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(score) as avg_score,
    STDDEV(score) as score_stddev,
    MIN(score) as min_score,
    MAX(score) as max_score,
    COUNT(*) FILTER (WHERE test_type = 'meteor') as meteor_tests,
    COUNT(*) FILTER (WHERE test_type = 'sentence_bert') as sentence_bert_tests,
    MAX(created_at) as last_test_date
FROM test_results
GROUP BY scenario_id;

-- =====================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =====================================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE(
    table_name text,
    index_name text,
    index_size text,
    table_size text,
    index_usage_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        idx_scan as index_usage_count
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get slow query recommendations
CREATE OR REPLACE FUNCTION get_slow_query_recommendations()
RETURNS TABLE(
    recommendation text,
    priority text,
    table_affected text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Consider adding index on frequently queried columns' as recommendation,
        'HIGH' as priority,
        'test_results' as table_affected
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'test_results' 
        AND indexname = 'idx_test_results_user_type_created'
    )
    
    UNION ALL
    
    SELECT 
        'Consider partitioning large tables by date' as recommendation,
        'MEDIUM' as priority,
        'test_results' as table_affected
    WHERE (
        SELECT COUNT(*) FROM test_results
    ) > 100000;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Function to update table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    -- Update statistics for all tables
    ANALYZE test_results;
    ANALYZE scenario_references;
    ANALYZE test_scenario_references;
    ANALYZE profiles;
    
    -- Log the update
    RAISE NOTICE 'Table statistics updated at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old test results (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_test_results(days_to_keep integer DEFAULT 365)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete test results older than specified days
    DELETE FROM test_results 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Update statistics after cleanup
    ANALYZE test_results;
    
    RETURN deleted_count;
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

COMMENT ON VIEW user_test_statistics IS 'Optimized view for user test statistics with pre-aggregated metrics';
COMMENT ON VIEW scenario_performance_analysis IS 'Optimized view for scenario performance analysis across users';

COMMENT ON FUNCTION analyze_query_performance() IS 'Analyzes database query performance and index usage statistics';
COMMENT ON FUNCTION get_slow_query_recommendations() IS 'Provides recommendations for optimizing slow queries';
COMMENT ON FUNCTION update_table_statistics() IS 'Updates table statistics for query optimizer';
COMMENT ON FUNCTION cleanup_old_test_results(integer) IS 'Cleanup function for maintaining database size (optional)';