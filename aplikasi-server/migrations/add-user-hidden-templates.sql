-- Create table to track which templates are hidden by which users
CREATE TABLE IF NOT EXISTS user_hidden_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES scenario_references(id) ON DELETE CASCADE,
  hidden_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, template_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_hidden_templates_user_id ON user_hidden_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_templates_template_id ON user_hidden_templates(template_id);

-- Enable RLS
ALTER TABLE user_hidden_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own hidden templates
CREATE POLICY "Users can view own hidden templates"
  ON user_hidden_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can hide templates for themselves
CREATE POLICY "Users can hide templates"
  ON user_hidden_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can unhide templates for themselves
CREATE POLICY "Users can unhide templates"
  ON user_hidden_templates
  FOR DELETE
  USING (auth.uid() = user_id);
