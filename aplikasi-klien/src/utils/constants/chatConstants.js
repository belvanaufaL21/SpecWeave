// Storage keys untuk localStorage
export const STORAGE_KEYS = {
  CHATS: 'specweave_chats',
  HISTORY: 'specweave_chat_history',
  ACTIVE_CHAT_ID: 'specweave_active_chat_id'
};

// Event names untuk custom events
export const CHAT_EVENTS = {
  HISTORY_UPDATED: 'chatHistoryUpdated'
};

// UI constants
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: '280px',
  ANIMATION_DURATION: 300,
  HOVER_TIMEOUT: 600,
  MESSAGE_DELAY: 100
};

// Chat title patterns
export const CHAT_PATTERNS = {
  TITLE_PREFIX: 'StoryConvert',
  TITLE_REGEX: /^StoryConvert(\d+)$/
};

// Message roles
export const MESSAGE_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

// Default values
export const DEFAULTS = {
  CHAT_DATE: 'Just now',
  EMPTY_ARRAY: [],
  EMPTY_OBJECT: {}
};