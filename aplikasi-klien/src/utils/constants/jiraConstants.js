// JIRA Context constants
export const JIRA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const JIRA_TIMEOUT = 10000; // 10 seconds
export const EPIC_FORCE_CLEAR_THRESHOLD = 3000; // 3 seconds

// Storage keys
export const JIRA_STORAGE_KEYS = {
  EPIC_CONTEXT: 'specweave_epic_context',
  EPIC_FORCE_CLEAR_TIME: 'epic_force_clear_time',
  JIRA_CONNECTION: 'specweave_jira_connection',
  ACTIVE_PROJECT: 'specweave_active_project'
};

// Event names
export const JIRA_EVENTS = {
  FORCE_EPIC_CLEAR: 'forceEpicContextClear',
  FORCE_EPIC_REFRESH: 'forceEpicContextRefresh',
  CONNECTION_UPDATED: 'jiraConnectionUpdated'
};

// Status types
export const JIRA_STATUS = {
  LOADING: 'loading',
  NO_CONNECTION: 'no_connection',
  NO_EPIC: 'no_epic',
  READY: 'ready',
  ERROR: 'error'
};

// Status colors
export const STATUS_COLORS = {
  [JIRA_STATUS.LOADING]: 'blue',
  [JIRA_STATUS.NO_CONNECTION]: 'red',
  [JIRA_STATUS.NO_EPIC]: 'yellow',
  [JIRA_STATUS.READY]: 'green',
  [JIRA_STATUS.ERROR]: 'red'
};

// Default state
export const DEFAULT_JIRA_STATE = {
  // Connection State
  connections: [],
  hasConnection: false,
  isLoadingConnections: true,
  
  // Epic State
  epicContext: null,
  hasEpic: false,
  isLoadingEpic: true,
  
  // UI State
  isEpicModalOpen: false,
  isJiraSetupModalOpen: false,
  
  // Error State
  error: null,
  
  // Last Updated
  lastUpdated: null,
  
  // Cache State
  lastConnectionsRefresh: null,
  lastEpicRefresh: null
};