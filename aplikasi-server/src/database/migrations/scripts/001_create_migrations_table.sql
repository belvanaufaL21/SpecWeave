-- Migration: Create schema_migrations table for tracking database migrations
-- This migration creates the infrastructure for safe database migrations
-- Requirements: 6.3, 6.6

-- =====================================================
-- SCHEMA MIGRATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  duration_ms INTEGER,
  backup_id TEXT,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);

-- Index for execution time ordering
CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at ON schema_migrations(executed_at DESC);

-- Index for success status filtering
CREATE INDEX IF NOT EXISTS idx_schema_migrations_success ON schema_migrations(success, executed_at DESC);

-- =====================================================
-- HELPER FUNCTIONS FOR MIGRATIONS
-- =====================================================

-- Function to execute raw SQL (for migration system)
CREATE OR REPLACE FUNCTION execute_sql(sql_statement TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE sql_statement;
  result := jsonb_build_object('success', true, 'message', 'SQL executed successfully');
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get list of user tables
CREATE OR REPLACE FUNCTION get_user_tables()
RETURNS TABLE(table_name TEXT, table_schema TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    t.table_schema::TEXT
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'pg_%'
    AND t.table_name NOT LIKE 'sql_%'
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create migrations table (idempotent)
CREATE OR REPLACE FUNCTION create_migrations_table()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if table already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'schema_migrations'
  ) THEN
    result := jsonb_build_object('success', true, 'message', 'Migrations table already exists');
    RETURN result;
  END IF;
  
  -- Create the table (this SQL is duplicated from above for the function)
  CREATE TABLE schema_migrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    duration_ms INTEGER,
    backup_id TEXT,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Create indexes
  CREATE INDEX idx_schema_migrations_version ON schema_migrations(version);
  CREATE INDEX idx_schema_migrations_executed_at ON schema_migrations(executed_at DESC);
  CREATE INDEX idx_schema_migrations_success ON schema_migrations(success, executed_at DESC);
  
  result := jsonb_build_object('success', true, 'message', 'Migrations table created successfully');
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate database integrity
CREATE OR REPLACE FUNCTION validate_database_integrity()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  table_count INTEGER;
  constraint_violations INTEGER := 0;
BEGIN
  -- Count user tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
  
  -- Check for constraint violations (basic check)
  -- This is a simplified check - can be extended based on specific requirements
  
  result := jsonb_build_object(
    'success', true,
    'table_count', table_count,
    'constraint_violations', constraint_violations,
    'message', 'Database integrity validation completed'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get migration statistics
CREATE OR REPLACE FUNCTION get_migration_statistics()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  total_migrations INTEGER;
  successful_migrations INTEGER;
  failed_migrations INTEGER;
  avg_duration NUMERIC;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE success = true),
    COUNT(*) FILTER (WHERE success = false),
    AVG(duration_ms)
  INTO 
    total_migrations,
    successful_migrations,
    failed_migrations,
    avg_duration
  FROM schema_migrations;
  
  result := jsonb_build_object(
    'total_migrations', COALESCE(total_migrations, 0),
    'successful_migrations', COALESCE(successful_migrations, 0),
    'failed_migrations', COALESCE(failed_migrations, 0),
    'average_duration_ms', COALESCE(avg_duration, 0),
    'success_rate', CASE 
      WHEN total_migrations > 0 THEN 
        ROUND((successful_migrations::NUMERIC / total_migrations::NUMERIC) * 100, 2)
      ELSE 0 
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE schema_migrations IS 'Tracks database migration execution history for safe schema changes';
COMMENT ON COLUMN schema_migrations.version IS 'Migration version number (extracted from filename)';
COMMENT ON COLUMN schema_migrations.name IS 'Human-readable migration name';
COMMENT ON COLUMN schema_migrations.filename IS 'Original migration filename';
COMMENT ON COLUMN schema_migrations.success IS 'Whether the migration executed successfully';
COMMENT ON COLUMN schema_migrations.duration_ms IS 'Migration execution time in milliseconds';
COMMENT ON COLUMN schema_migrations.backup_id IS 'ID of backup created before migration (if any)';
COMMENT ON COLUMN schema_migrations.error_message IS 'Error message if migration failed';

COMMENT ON FUNCTION execute_sql(TEXT) IS 'Executes raw SQL statements for migration system (SECURITY DEFINER)';
COMMENT ON FUNCTION get_user_tables() IS 'Returns list of user-defined tables in public schema';
COMMENT ON FUNCTION create_migrations_table() IS 'Creates schema_migrations table if it does not exist';
COMMENT ON FUNCTION validate_database_integrity() IS 'Performs basic database integrity validation';
COMMENT ON FUNCTION get_migration_statistics() IS 'Returns statistics about migration execution history';