# Logging System

## Overview
Sistem logging yang telah dioptimalkan untuk mengurangi noise dan fokus pada informasi penting.

## Configuration

### Environment Variables

**Server (aplikasi-server/.env):**
```
LOG_LEVEL=ERROR              # ERROR, WARN, INFO, DEBUG
ENABLE_CONSOLE_LOGS=false    # true/false
HEALTH_CHECK_VERBOSE=false   # true/false
```

**Client (aplikasi-klien/.env):**
```
VITE_LOG_LEVEL=ERROR         # ERROR, WARN, INFO, DEBUG
VITE_ENABLE_CONSOLE_LOGS=false # true/false
```

## Log Levels

1. **ERROR** - Only critical errors that require immediate attention
2. **WARN** - Warnings that should be monitored but don't break functionality
3. **INFO** - Important information for debugging (development only)
4. **DEBUG** - Detailed debugging information (development only)

## Usage

### Server
```javascript
import logger from '../config/logging.js';

logger.error('AUTH', 'Authentication failed', { userId, error });
logger.warn('DATABASE', 'Connection timeout', { retryCount });
logger.info('API', 'Request processed', { endpoint, duration });
logger.debug('CACHE', 'Cache hit', { key, value });
```

### Client
```javascript
import logger from '../config/logging.js';

logger.error('AUTH-CONTEXT', 'Login failed', { error });
logger.warn('JIRA-CONTEXT', 'Connection unstable', { connectionId });
logger.info('CHAT-CONTEXT', 'Message sent', { messageId });
logger.debug('UI', 'Component rendered', { component });
```

## Production Settings
- LOG_LEVEL=ERROR
- ENABLE_CONSOLE_LOGS=false
- Only critical errors are logged to console
- All logs are structured for monitoring tools

## Development Settings
- LOG_LEVEL=INFO
- ENABLE_CONSOLE_LOGS=true
- More verbose logging for debugging
- Console output includes timestamps and structured data

## Changes Made

### Removed Excessive Logging
- Removed emoji-based logging (🚀, 🔍, 📝, etc.)
- Removed verbose request/response logging
- Removed debug logs from production code
- Removed redundant logging patterns

### Cleaned Up Files
- `gherkinController.js` - Removed 15+ console.log statements
- `authService.js` - Removed 20+ console.log statements
- `aiService.js` - Removed verbose AI processing logs
- `JiraContext.jsx` - Removed 15+ console.log statements
- `AuthContext.jsx` - Removed 10+ console.log statements
- `AuthCallback.jsx` - Removed 12+ console.log statements
- `comprehensiveMonitoringMiddleware.js` - Reduced monitoring noise

### Deleted Unnecessary Files
- `HEALTH_LOGGING_SUMMARY.md`
- `README_HEALTH_LOGGING.md`
- `HEALTH_CHECK_LOGGING.md`
- `CONSOLE_CLEANUP_SUMMARY.md`
- `LOGGING_CLEANUP_GUIDE.md`

## Benefits
- Cleaner console output
- Better performance (less logging overhead)
- Easier debugging (focused on important events)
- Production-ready logging configuration
- Structured logs for monitoring tools