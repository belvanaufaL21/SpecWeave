-- Add JIRA Integration Tables to SpecWeave Database
-- This creates all necessary tables for JIRA integration

-- =====================================================
-- JIRA Connections Table
-- =====================================================

CREATE TABLE IF NOT EXISTS jira_connections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  jira_url TEXT NOT NULL,
  email TEXT, -- Will be encrypted at application level
  api_token TEXT, -- Will be encrypted at application level
  access_token TEXT, -- For OAuth (legacy support)
  refresh_token TEXT, -- For OAuth (legacy support)
  auth_type TEXT DEFAULT 'api_token' CHECK (auth_type IN ('api_token', 'oauth')),
  project_key TEXT,
  issue_type TEXT,
  custom_fields TEXT DEFAULT '{}', -- JSON string
  server_info TEXT DEFAULT '{}', -- JSON string
  project_info TEXT DEFAULT '{}', -- JSON string
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Epic Context Table
-- =====================================================

CREATE TABLE IF NOT EXISTS epic_contexts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  session_id TEXT, -- For anonymous users or session-based context
  epic_id TEXT, -- JIRA Epic ID (can be null for "work without epic")
  epic_data TEXT NOT NULL, -- JSON string with complete Epic information
  connection_id TEXT,
  project_key TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  expires_at DATETIME DEFAULT (datetime('now', '+24 hours')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES jira_connections(id) ON DELETE CASCADE
);

-- =====================================================
-- Scenarios Table (Main table for generated scenarios)
-- =====================================================

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  user_story TEXT NOT NULL,
  feature_name TEXT,
  description TEXT,
  scenarios_json TEXT NOT NULL, -- JSON string with Gherkin scenarios
  template_id TEXT,
  tags TEXT, -- JSON array as string
  is_public INTEGER DEFAULT 0,
  meteor_score REAL,
  generation_time_ms INTEGER,
  quality_level TEXT CHECK (quality_level IN ('excellent', 'good', 'acceptable', 'poor', 'very_poor')),
  -- JIRA Integration fields
  jira_epic_id TEXT,
  jira_user_story_id TEXT,
  jira_subtask_ids TEXT, -- JSON array as string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Templates Table (for user story templates)
-- =====================================================

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  variables TEXT DEFAULT '[]', -- JSON array as string
  is_system INTEGER DEFAULT 0,
  created_by TEXT,
  usage_count INTEGER DEFAULT 0,
  tags TEXT, -- JSON array as string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Users Table (basic user info)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  preferences TEXT DEFAULT '{}', -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Create Indexes
-- =====================================================

-- Indexes for jira_connections
CREATE INDEX IF NOT EXISTS idx_jira_user_id ON jira_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_active ON jira_connections(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_jira_project_key ON jira_connections(project_key);

-- Indexes for epic_contexts
CREATE INDEX IF NOT EXISTS idx_epic_contexts_user_id ON epic_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_session_id ON epic_contexts(session_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_epic_id ON epic_contexts(epic_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_connection_id ON epic_contexts(connection_id);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_project_key ON epic_contexts(project_key);
CREATE INDEX IF NOT EXISTS idx_epic_contexts_active ON epic_contexts(is_active) WHERE is_active = 1;
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

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- Triggers for updated_at
-- =====================================================

-- Trigger for jira_connections updated_at
CREATE TRIGGER IF NOT EXISTS update_jira_connections_updated_at 
AFTER UPDATE ON jira_connections
FOR EACH ROW
BEGIN
  UPDATE jira_connections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for epic_contexts updated_at
CREATE TRIGGER IF NOT EXISTS update_epic_contexts_updated_at 
AFTER UPDATE ON epic_contexts
FOR EACH ROW
BEGIN
  UPDATE epic_contexts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for scenarios updated_at
CREATE TRIGGER IF NOT EXISTS update_scenarios_updated_at 
AFTER UPDATE ON scenarios
FOR EACH ROW
BEGIN
  UPDATE scenarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for templates updated_at
CREATE TRIGGER IF NOT EXISTS update_templates_updated_at 
AFTER UPDATE ON templates
FOR EACH ROW
BEGIN
  UPDATE templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger for users updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;