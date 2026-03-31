-- Rollback Migration: Remove optimized indexes and restore basic ones
-- This rollback script removes the optimized indexes added in 002_optimize_existing_indexes.sql
-- Requirements: 6.3, 6.6

-- =====================================================
-- REMOVE OPTIMIZED INDEXES FOR TEST_RESULTS TABLE
-- =====================================================

-- Drop optimized indexes
DROP INDEX IF EXISTS idx_test_results_user_type_created;
DROP INDEX IF EXISTS idx_test_results_scenario_score;
DROP INDEX IF EXISTS idx_test_results_high_scores;
DROP INDEX IF EXISTS idx_test_results_text_search;
DROP INDEX IF EXISTS idx_test_results_details_gin;
DROP INDEX IF EXISTS idx_test_results_covering;

-- Restore basic indexes
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_scenario_id ON test_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_type ON test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at DESC);

-- =====================================================
-- REMOVE OPTIMIZED INDEXES FOR SCENARIO_REFERENCES TABLE
-- =====================================================

-- Drop optimized indexes
DROP INDEX IF EXISTS idx_scenario_references_user_usage;
DROP INDEX IF EXISTS idx_scenario_references_popular;
DROP INDEX IF EXISTS idx_scenario_references_description_search;

-- Restore basic indexes
CREATE INDEX IF NOT EXISTS idx_scenario_references_user_id ON scenario_references(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_references_created_at ON scenario_references(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_references_usage_count ON scenario_references(usage_count DESC);

-- =====================================================
-- REMOVE OPTIMIZED INDEXES FOR TEST_SCENARIO_REFERENCES TABLE
-- =====================================================

-- Drop optimized indexes
DROP INDEX IF EXISTS idx_test_scenario_refs_user_usage;
DROP INDEX IF EXISTS idx_test_scenario_refs_user_tags;
DROP INDEX IF EXISTS idx_test_scenario_refs_active;

-- Restore basic indexes
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_user_id ON test_scenario_references(user_id);
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_created_at ON test_scenario_references(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_scenario_references_usage_count ON test_scenario_references(usage_count DESC);

-- =====================================================
-- REMOVE OPTIMIZED INDEXES FOR PROFILES TABLE
-- =====================================================

-- Drop optimized indexes
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_profiles_updated_at;
DROP INDEX IF EXISTS idx_profiles_active;

-- =====================================================
-- REMOVE OPTIMIZED INDEXES FOR ERROR_LOGS TABLE
-- =====================================================

-- Drop optimized indexes if they exist
DROP INDEX IF EXISTS idx_error_logs_timestamp_severity;
DROP INDEX IF EXISTS idx_error_logs_user_type;
DROP INDEX IF EXISTS idx_error_logs_recent;

-- =====================================================
-- REMOVE OPTIMIZATION VIEWS
-- =====================================================

-- Drop optimized views
DROP VIEW IF EXISTS user_test_statistics;
DROP VIEW IF EXISTS scenario_performance_analysis;
DROP VIEW IF EXISTS daily_test_activity;

-- =====================================================
-- REMOVE OPTIMIZATION FUNCTIONS
-- =====================================================

-- Drop optimization functions
DROP FUNCTION IF EXISTS analyze_index_usage();
DROP FUNCTION IF EXISTS get_optimization_recommendations();
DROP FUNCTION IF EXISTS update_table_statistics();

-- =====================================================
-- RESTORE BASIC VIEWS (if they existed before)
-- =====================================================

-- Create basic user statistics view
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

-- Create basic scenario performance view
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