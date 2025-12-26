-- Add Epic Context Table for JIRA Integration
-- This table stores Epic context for user sessions

-- =====================================================
-- Epic Context Table
-- =====================================================

CREATE TABLE IF NOT EXISTS epic_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255), -- For anonymous users or session-based context
  epic_id VARCHAR(100), -- JIRA Epic ID (can be null for "work without epic")
  epic_data JSONB NOT NULL, -- Complete Epic information
  connection_id UUID REFERENCES jira_connections(id) ON DELETE CASCADE,
  project_key VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE epic_contexts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for epic_contexts
CREATE POLICY "Users can view own epic contexts" ON epic_contexts
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can insert own epic contexts" ON epic_contexts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can update own epic contexts" ON epic_contexts
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

CREATE POLICY "Users can delete own epic contexts" ON epic_contexts
  FOR DELETE USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  );

-- Indexes for epic_contexts
CREATE INDEX IF NOT EXISTS idx_epic_contexts_user_id ON epic_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_session_id ON epic_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_epic_id ON epic_contexts(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_connection_id ON epic_contexts(connection_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_project_key ON epic_contexts(project_key);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_active ON epic_contexts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_epic_contexts_expires_at ON epic_contexts(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_epic_contexts_updated_at BEFORE UPDATE ON epic_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Function to Clean Up Expired Epic Contexts
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_epic_contexts()
RETURNS INTEGER AS $
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM epic_contexts 
  WHERE expires_at < NOW() OR (is_active = false AND updated_at < NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to Get Active Epic Context for User
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_epic_context(p_user_id UUID DEFAULT NULL, p_session_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  epic_id VARCHAR,
  epic_data JSONB,
  connection_id UUID,
  project_key VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    ec.id,
    ec.epic_id,
    ec.epic_data,
    ec.connection_id,
    ec.project_key,
    ec.created_at,
    ec.updated_at
  FROM epic_contexts ec
  WHERE 
    ec.is_active = true 
    AND ec.expires_at > NOW()
    AND (
      (p_user_id IS NOT NULL AND ec.user_id = p_user_id) OR
      (p_session_id IS NOT NULL AND ec.session_id = p_session_id)
    )
  ORDER BY ec.updated_at DESC
  LIMIT 1;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to Set Epic Context
-- =====================================================

CREATE OR REPLACE FUNCTION set_epic_context(
  p_user_id UUID DEFAULT NULL,
  p_session_id VARCHAR DEFAULT NULL,
  p_epic_id VARCHAR DEFAULT NULL,
  p_epic_data JSONB DEFAULT NULL,
  p_connection_id UUID DEFAULT NULL,
  p_project_key VARCHAR DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  context_id UUID;
BEGIN
  -- Deactivate existing contexts for this user/session
  UPDATE epic_contexts 
  SET is_active = false, updated_at = NOW()
  WHERE 
    is_active = true 
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_session_id IS NOT NULL AND session_id = p_session_id)
    );
  
  -- Insert new context
  INSERT INTO epic_contexts (
    user_id,
    session_id,
    epic_id,
    epic_data,
    connection_id,
    project_key,
    is_active,
    expires_at
  ) VALUES (
    p_user_id,
    p_session_id,
    p_epic_id,
    p_epic_data,
    p_connection_id,
    p_project_key,
    true,
    NOW() + INTERVAL '24 hours'
  )
  RETURNING id INTO context_id;
  
  RETURN context_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function to Clear Epic Context
-- =====================================================

CREATE OR REPLACE FUNCTION clear_epic_context(
  p_user_id UUID DEFAULT NULL,
  p_session_id VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $
DECLARE
  cleared_count INTEGER;
BEGIN
  UPDATE epic_contexts 
  SET is_active = false, updated_at = NOW()
  WHERE 
    is_active = true 
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_session_id IS NOT NULL AND session_id = p_session_id)
    );
  
  GET DIAGNOSTICS cleared_count = ROW_COUNT;
  
  RETURN cleared_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;