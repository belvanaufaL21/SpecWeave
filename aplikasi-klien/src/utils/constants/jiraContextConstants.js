/**
 * Konstanta untuk JIRA Context
 */

export const JIRA_CONTEXT_CONSTANTS = {
  // Cache duration (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000,

  // Force clear block duration (3 seconds)
  FORCE_CLEAR_BLOCK_DURATION: 3000,

  // Storage keys
  STORAGE_KEYS: {
    EPIC_CONTEXT: 'specweave_epic_context',
    EPIC_FORCE_CLEAR_TIME: 'epic_force_clear_time'
  },

  // Status types
  STATUS_TYPES: {
    LOADING: 'loading',
    ERROR: 'error',
    NO_CONNECTION: 'no-connection',
    NO_EPIC: 'no-epic',
    READY: 'ready'
  },

  // Status messages
  STATUS_MESSAGES: {
    LOADING: 'Loading JIRA status...',
    NO_CONNECTION: 'JIRA not connected',
    NO_EPIC: 'No Epic selected',
    READY: 'Ready for export'
  },

  // Status colors
  STATUS_COLORS: {
    LOADING: 'gray',
    ERROR: 'red',
    NO_CONNECTION: 'red',
    NO_EPIC: 'yellow',
    READY: 'green'
  },

  // Essential storage keys untuk clearing
  ESSENTIAL_STORAGE_KEYS: [
    'specweave_epic_context',
    'epic_context'
  ]
};