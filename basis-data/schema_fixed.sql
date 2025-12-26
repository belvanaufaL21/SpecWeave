-- SpecWeave Database Schema for Supabase (Fixed Version)
-- This file contains all the database tables and RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- User Profiles Table (extends Supabase auth.users)
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- =====================================================
-- Templates Table
-- =====================================================

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Anyone can view system templates" ON templates
  FOR SELECT USING (is_system = true);

CREATE POLICY "Users can view own templates" ON templates
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = created_by AND is_system = false);

CREATE POLICY "Users can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = created_by AND is_system = false);

CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (auth.uid() = created_by AND is_system = false);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_system ON templates(is_system);
CREATE INDEX IF NOT EXISTS idx_templates_usage ON templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN(tags);

-- =====================================================
-- Scenarios Table
-- =====================================================

CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  user_story TEXT NOT NULL,
  feature_name VARCHAR(255),
  description TEXT,
  scenarios_json JSONB NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  jira_epic_id VARCHAR(100),
  jira_user_story_id VARCHAR(100),
  jira_subtask_ids TEXT[],
  meteor_score FLOAT,
  generation_time_ms INTEGER,
  quality_level VARCHAR(20) CHECK (quality_level IN ('excellent', 'good', 'acceptable', 'poor', 'very_poor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scenarios
CREATE POLICY "Users can view own scenarios" ON scenarios
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own scenarios" ON scenarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scenarios" ON scenarios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scenarios" ON scenarios
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for scenarios
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenarios_tags ON scenarios USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_scenarios_json ON scenarios USING GIN(scenarios_json);
CREATE INDEX IF NOT EXISTS idx_scenarios_public ON scenarios(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_scenarios_jira_epic ON scenarios(jira_epic_id) WHERE jira_epic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenarios_meteor_score ON scenarios(meteor_score) WHERE meteor_score IS NOT NULL;

-- =====================================================
-- JIRA Connections Table
-- =====================================================

CREATE TABLE IF NOT EXISTS jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  jira_url VARCHAR(500) NOT NULL,
  access_token TEXT NOT NULL, -- Will be encrypted at application level
  refresh_token TEXT, -- Will be encrypted at application level
  project_key VARCHAR(50),
  issue_type VARCHAR(50),
  custom_fields JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE jira_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jira_connections
CREATE POLICY "Users can view own JIRA connections" ON jira_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own JIRA connections" ON jira_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own JIRA connections" ON jira_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own JIRA connections" ON jira_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for jira_connections
CREATE INDEX IF NOT EXISTS idx_jira_user_id ON jira_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_jira_active ON jira_connections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_jira_project_key ON jira_connections(project_key);

-- =====================================================
-- Evaluation Metrics Table
-- =====================================================

CREATE TABLE IF NOT EXISTS evaluation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_id VARCHAR(100) NOT NULL,
  meteor_score FLOAT NOT NULL,
  precision_score FLOAT NOT NULL,
  recall_score FLOAT NOT NULL,
  fmean_score FLOAT NOT NULL,
  fragmentation_penalty FLOAT NOT NULL,
  generation_time_ms INTEGER NOT NULL,
  quality_level VARCHAR(20) NOT NULL CHECK (quality_level IN ('excellent', 'good', 'acceptable', 'poor', 'very_poor')),
  reference_type VARCHAR(50), -- 'template', 'previous_scenario', 'manual'
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE evaluation_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_metrics
CREATE POLICY "Users can view own evaluation metrics" ON evaluation_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert evaluation metrics" ON evaluation_metrics
  FOR INSERT WITH CHECK (true); -- Allow system to insert

-- Indexes for evaluation_metrics
CREATE INDEX IF NOT EXISTS idx_evaluation_scenario_id ON evaluation_metrics(scenario_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_user_id ON evaluation_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_created_at ON evaluation_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_meteor_score ON evaluation_metrics(meteor_score);
CREATE INDEX IF NOT EXISTS idx_evaluation_quality_level ON evaluation_metrics(quality_level);
CREATE INDEX IF NOT EXISTS idx_evaluation_request_id ON evaluation_metrics(request_id);

-- =====================================================
-- Performance Logs Table
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type VARCHAR(50) NOT NULL, -- 'gherkin_generation', 'meteor_evaluation'
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_logs
CREATE POLICY "Users can view own performance logs" ON performance_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert performance logs" ON performance_logs
  FOR INSERT WITH CHECK (true); -- Allow system to insert

-- Indexes for performance_logs
CREATE INDEX IF NOT EXISTS idx_performance_user_id ON performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_operation_type ON performance_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_performance_created_at ON performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_duration ON performance_logs(duration_ms);
CREATE INDEX IF NOT EXISTS idx_performance_request_id ON performance_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_performance_success ON performance_logs(success);

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jira_connections_updated_at BEFORE UPDATE ON jira_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $
BEGIN
  UPDATE templates 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Views for Analytics
-- =====================================================

-- View for user scenario statistics
CREATE OR REPLACE VIEW user_scenario_stats AS
SELECT 
  u.id as user_id,
  p.name as user_name,
  COUNT(s.id) as total_scenarios,
  COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as scenarios_last_30_days,
  AVG(s.meteor_score) as avg_meteor_score,
  AVG(s.generation_time_ms) as avg_generation_time_ms,
  COUNT(CASE WHEN s.quality_level IN ('excellent', 'good') THEN 1 END) as high_quality_scenarios
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN scenarios s ON u.id = s.user_id
GROUP BY u.id, p.name;

-- View for template usage statistics
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT 
  t.id,
  t.name,
  t.category,
  t.usage_count,
  COUNT(s.id) as actual_usage_count,
  AVG(s.meteor_score) as avg_meteor_score_with_template
FROM templates t
LEFT JOIN scenarios s ON t.id = s.template_id
GROUP BY t.id, t.name, t.category, t.usage_count;

-- View for quality trends
CREATE OR REPLACE VIEW quality_trends AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_scenarios,
  AVG(meteor_score) as avg_meteor_score,
  AVG(generation_time_ms) as avg_generation_time_ms,
  COUNT(CASE WHEN quality_level IN ('excellent', 'good') THEN 1 END) as high_quality_count,
  COUNT(CASE WHEN quality_level IN ('poor', 'very_poor') THEN 1 END) as low_quality_count
FROM scenarios
WHERE meteor_score IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;