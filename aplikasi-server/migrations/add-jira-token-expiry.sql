-- Add token status tracking to jira_connections table
-- Note: token_expires_at column already exists in the table
-- This migration adds status tracking and warning timestamp

ALTER TABLE jira_connections 
ADD COLUMN IF NOT EXISTS token_status VARCHAR(20) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS last_expiry_warning_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN jira_connections.token_expires_at IS 'When the JIRA API token will expire (user input from JIRA token settings)';
COMMENT ON COLUMN jira_connections.token_status IS 'Token status: valid, expiring_soon, expired, unknown';
COMMENT ON COLUMN jira_connections.last_expiry_warning_at IS 'Last time user was warned about token expiry (to prevent spam notifications)';

-- Create index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_jira_connections_token_status ON jira_connections(token_status);
CREATE INDEX IF NOT EXISTS idx_jira_connections_token_expires_at ON jira_connections(token_expires_at);

-- Update existing records to calculate initial token status
-- This will set status based on existing token_expires_at values
UPDATE jira_connections
SET token_status = CASE
  WHEN token_expires_at IS NULL THEN 'unknown'
  WHEN token_expires_at < CURRENT_DATE THEN 'expired'
  WHEN token_expires_at <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
  ELSE 'valid'
END
WHERE token_status IS NULL OR token_status = 'unknown';
