-- Add JIRA Integration Tables to SpecWeave Database (PostgreSQL Version)
-- This creates all necessary tables for JIRA integration

-- =====================================================
-- JIRA Connections Table
-- =====================================================

CREATE TABLE IF NOT EXISTS jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  jira_url TEXT NOT NULL,
  email TEXT, -- Will be encrypted at application level
  api_token TEXT, -- Will be encrypted at application level
  access_token TEXT, -- For OAuth (legacy support)
  refresh_token TEXT, -- For OAuth (legacy support)
  auth_type TEXT DEFAULT 'api_token' CHECK (auth_type IN ('api_token', 'oauth')),
  project_key TEXT,
  issue_type TEXT,
  custom_fields JSONB DEFAULT '{}',
  server_info JSONB DEFAULT '{}',
  project_info JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Epic Context Table
-- =====================================================

CREATE TABLE IF NOT EXISTS epic_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT, -- For anonymous users or session-based context
  epic_id TEXT, -- JIRA Epic ID (can be null for "work without epic")
  epic_data JSONB NOT NULL, -- JSON with complete Epic information
  connection_id UUID,
  project_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (connection_id) REFERENCES jira_connections(id) ON DELETE CASCADE
);

-- =====================================================
-- Scenarios Table (Main table for generated scenarios)
-- =====================================================

CREATE TABLE IF NOT EXISTS scenarios (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  user_story TEXT NOT NULL,
  feature_name TEXT,
  description TEXT,
  scenarios_json JSONB NOT NULL, -- JSON with Gherkin scenarios
  template_id UUID,
  tags JSONB, -- JSON array
  is_public BOOLEAN DEFAULT false,
  meteor_score REAL,
  generation_time_ms INTEGER,
  quality_level TEXT CHECK (quality_level IN ('excellent', 'good', 'acceptable', 'poor', 'very_poor')),
  -- JIRA Integration fields
  jira_epic_id TEXT,
  jira_user_story_id TEXT,
  jira_subtask_ids JSONB, -- JSON array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Templates Table (for user story templates)
-- =====================================================

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- JSON array
  is_system BOOLEAN DEFAULT false,
  created_by UUID,
  usage_count INTEGER DEFAULT 0,
  tags JSONB, -- JSON array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Users Table (basic user info) - Only if not exists
-- Note: This might conflict with Supabase auth.users
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- =====================================================
-- Create Indexes
-- =====================================================

-- Indexes for jira_connections
CREATE INDEX IF NOT EXISTS idx_jira_user_id ON jira_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_active ON jira_connections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jira_project_key ON jira_connections(project_key);

-- Indexes for epic_contexts
CREATE INDEX IF NOT EXISTS idx_epic_contexts_user_id ON epic_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_session_id ON epic_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_epic_id ON epic_contexts(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_connection_id ON epic_contexts(connection_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_project_key ON epic_contexts(project_key);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_active ON epic_contexts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_epic_contexts_expires_at ON epic_contexts(expires_at);

-- Indexes for scenarios
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at);
CREATE INDEX IF NOT EXISTS idx_scenarios_jira_epic ON scenarios(jira_epic_id) WHERE jira_epic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenarios_jira_story ON scenarios(jira_user_story_id) WHERE jira_user_story_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenarios_meteor_score ON scenarios(meteor_score) WHERE meteor_score IS NOT NULL;

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_system ON templates(is_system);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);

-- Indexes for users (only if table was created)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  END IF;
END $$;

-- =====================================================
-- Functions for updated_at triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- Triggers for updated_at
-- =====================================================

-- Trigger for jira_connections updated_at
DROP TRIGGER IF EXISTS update_jira_connections_updated_at ON jira_connections;
CREATE TRIGGER update_jira_connections_updated_at 
  BEFORE UPDATE ON jira_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for epic_contexts updated_at
DROP TRIGGER IF EXISTS update_epic_contexts_updated_at ON epic_contexts;
CREATE TRIGGER update_epic_contexts_updated_at 
  BEFORE UPDATE ON epic_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for scenarios updated_at
DROP TRIGGER IF EXISTS update_scenarios_updated_at ON scenarios;
CREATE TRIGGER update_scenarios_updated_at 
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for templates updated_at
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at 
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users updated_at (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- Enable Row Level Security (RLS) for Supabase
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE jira_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE epic_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access their own data)

-- JIRA Connections policies
CREATE POLICY "Users can view their own JIRA connections" ON jira_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own JIRA connections" ON jira_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own JIRA connections" ON jira_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own JIRA connections" ON jira_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Epic Contexts policies
CREATE POLICY "Users can view their own epic contexts" ON epic_contexts
  FOR SELECT USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can insert their own epic contexts" ON epic_contexts
  FOR INSERT WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can update their own epic contexts" ON epic_contexts
  FOR UPDATE USING (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can delete their own epic contexts" ON epic_contexts
  FOR DELETE USING (auth.uid() = user_id OR session_id IS NOT NULL);

-- Scenarios policies
CREATE POLICY "Users can view their own scenarios" ON scenarios
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own scenarios" ON scenarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios" ON scenarios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios" ON scenarios
  FOR DELETE USING (auth.uid() = user_id);

-- Templates policies
CREATE POLICY "Users can view all templates" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = created_by OR is_system = false);

CREATE POLICY "Users can update their own templates" ON templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates" ON templates
  FOR DELETE USING (auth.uid() = created_by);

-- =====================================================
-- Success Message
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE 'JIRA tables created successfully for PostgreSQL/Supabase!';
  RAISE NOTICE 'Tables created: jira_connections, epic_contexts, scenarios, templates';
  RAISE NOTICE 'Row Level Security (RLS) enabled with basic policies';
  RAISE NOTICE 'Triggers created for automatic updated_at timestamps';
END $$;