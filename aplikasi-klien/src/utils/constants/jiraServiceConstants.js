// JIRA Service constants
export const JIRA_TIMEOUTS = {
  CONNECTIONS: 45000,      // Increased to 45 seconds
  EPICS: 45000,           // Increased to 45 seconds  
  VALIDATION: 30000,       // Increased to 30 seconds
  CONTEXT_SET: 30000,     // Increased to 30 seconds
  CONTEXT_GET: 45000,     // Increased to 45 seconds
  CONTEXT_CLEAR: 15000,    // Increased to 15 seconds
  OAUTH_START: 45000,     // Increased to 45 seconds
  OAUTH_COMPLETE: 60000,  // Increased to 60 seconds
  TEST_CONNECTION: 45000, // Increased to 45 seconds
  CREATE_CONNECTION: 45000, // Increased to 45 seconds
  EXPORT_STORY: 90000     // Increased to 90 seconds
};

// Cache durations
export const JIRA_CACHE = {
  CONNECTIONS: 60,        // 1 minute
  EPICS: 120,            // 2 minutes
  CONTEXT: 300           // 5 minutes
};

// Retry configurations
export const JIRA_RETRY = {
  MAX_ATTEMPTS: 3,
  TIMEOUT_MULTIPLIER: 1.5,
  DELAY_BASE: 1000       // 1 second base delay
};

// API endpoints
export const JIRA_ENDPOINTS = {
  CONNECTIONS: '/jira/connections',
  EPICS: (connectionId, projectKey) => `/jira/connections/${connectionId}/projects/${projectKey}/epics`,
  EPIC_VALIDATE: (connectionId, epicId) => `/jira/connections/${connectionId}/epics/${epicId}/validate`,
  EPIC_CONTEXT: '/epics/context',
  OAUTH_START: '/jira/oauth/start',
  OAUTH_CALLBACK: '/jira/oauth/callback',
  TEST_CONNECTION: '/jira/test-connection',
  CREATE_STORY: (connectionId, epicId) => `/jira/connections/${connectionId}/epics/${epicId}/complete-story`
};

// Error messages
export const JIRA_ERRORS = {
  CONNECTION_TIMEOUT: 'Connection timeout - server may be slow',
  EPIC_FETCH_TIMEOUT: 'Epic fetch timeout - JIRA server may be slow',
  EXPORT_TIMEOUT: 'Export is taking longer than expected. Please check your JIRA project to see if the issues were created.',
  VALIDATION_FAILED: 'Epic validation failed',
  CONTEXT_SET_FAILED: 'Failed to set Epic context',
  CONTEXT_GET_FAILED: 'Failed to get Epic context',
  CONTEXT_CLEAR_FAILED: 'Failed to clear Epic context',
  OAUTH_START_FAILED: 'Failed to start OAuth flow',
  OAUTH_COMPLETE_FAILED: 'Failed to complete OAuth flow',
  CONNECTION_TEST_FAILED: 'Connection test failed',
  CONNECTION_CREATE_FAILED: 'Failed to create connection',
  STORY_CREATE_FAILED: 'Failed to create story'
};

// Storage keys
export const JIRA_STORAGE = {
  EPIC_CONTEXT: 'specweave_epic_context',
  ACTIVE_PROJECT: 'specweave_active_project',
  CONNECTION_CACHE: 'specweave_jira_connections',
  EPIC_CACHE: 'specweave_epic_cache'
};

// Request headers
export const JIRA_HEADERS = {
  FAST_REQUEST: { 'X-Fast-Request': 'true' },
  CACHE_SHORT: { 'Cache-Control': 'max-age=60' },
  CACHE_MEDIUM: { 'Cache-Control': 'max-age=120' },
  CACHE_LONG: { 'Cache-Control': 'max-age=300' }
};