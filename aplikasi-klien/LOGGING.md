# Logging Configuration Guide

This application uses a centralized logging system that can be configured via environment variables.

## Quick Fix for Excessive Logging

If you're seeing too many console logs, add this to your `.env` file:

```env
# Reduce logging to only warnings and errors
VITE_LOG_LEVEL=warn

# Or disable all non-critical logs
VITE_LOG_LEVEL=none
```

## Log Levels

Set `VITE_LOG_LEVEL` in your `.env` file to control what gets logged:

- `debug` - Show all logs (most verbose)
- `info` - Show info, warnings, and errors (default)
- `warn` - Show only warnings and errors
- `error` - Show only errors
- `none` - Disable all logs except critical errors

## Other Logging Options

```env
# Disable startup message
VITE_ENABLE_STARTUP_MESSAGE=false

# Disable all console logs (not recommended)
VITE_ENABLE_CONSOLE_LOGS=false
```

## Production Behavior

In production mode (`NODE_ENV=production`):
- Info and debug logs are automatically disabled
- Only warnings and errors are shown
- Log data is not included in output

## React DevTools Duplicate Logs

If you see duplicate logs (one from your component, one from `installHook.js`), this is caused by React DevTools browser extension intercepting console calls. To fix:

1. Disable React DevTools extension temporarily
2. Or set `VITE_LOG_LEVEL=warn` to reduce log volume
3. Or use the browser console filter to hide specific messages

## Example Configuration

For development with minimal noise:
```env
VITE_LOG_LEVEL=warn
VITE_ENABLE_STARTUP_MESSAGE=true
```

For debugging:
```env
VITE_LOG_LEVEL=debug
VITE_ENABLE_STARTUP_MESSAGE=true
```

For production:
```env
VITE_LOG_LEVEL=error
VITE_ENABLE_STARTUP_MESSAGE=false
```
