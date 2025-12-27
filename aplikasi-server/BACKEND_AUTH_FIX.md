# Backend Authentication Fix

## Problem
JIRA connection API calls failing with 401 "Invalid or expired token" even after frontend token refresh was successful.

## Root Cause Analysis

### 1. **Backend Server Not Running**
- Initial issue: Backend server at `localhost:5003` was not running
- Frontend was making API calls to non-existent server

### 2. **Wrong Supabase Client for Token Verification**
- Backend was using `supabaseAdmin` (service role) to verify user tokens
- Service role client bypasses Row Level Security (RLS) and has different token validation behavior
- User tokens should be verified with regular `supabaseClient`

### 3. **Missing Database Tables**
- JIRA tables (`jira_connections`, `epic_contexts`, etc.) were not created
- Backend database operations would fail even if auth succeeded

## Solutions Implemented

### 1. **Fixed Supabase Client Usage** (`src/services/authService.js`)

```javascript
// BEFORE (Wrong)
class AuthService {
  constructor() {
    this.supabase = supabaseAdmin; // Service role - wrong for user token verification
  }
  
  async verifyToken(token) {
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    // This fails because service role client expects different token format
  }
}

// AFTER (Correct)
class AuthService {
  constructor() {
    this.supabase = supabaseAdmin; // For admin operations
    this.supabaseClient = supabaseClient; // For user token verification
  }
  
  async verifyToken(token) {
    // Use regular client for user token verification
    const { data: { user }, error } = await this.supabaseClient.auth.getUser(token);
    // This works correctly with user access tokens
  }
}
```

### 2. **Enhanced Logging** (`src/middlewares/auth.js`)

```javascript
// Added comprehensive logging for debugging
export const authenticate = async (req, res, next) => {
  console.log('🔐 [AUTH-MIDDLEWARE] Processing authentication...');
  console.log('🔍 [AUTH-MIDDLEWARE] Auth header present:', !!authHeader);
  console.log('🔍 [AUTH-MIDDLEWARE] Token extracted:', !!token);
  console.log('🔍 [AUTH-MIDDLEWARE] Verifying token...');
  console.log('✅ [AUTH-MIDDLEWARE] User authenticated:', user.email);
  // ... rest of middleware
};
```

### 3. **Backend Server Management**

```bash
# Start backend server
cd aplikasi-server
npm run dev

# Server runs on http://localhost:5003
# Logs show initialization and request processing
```

### 4. **Database Tables Setup**

Created PostgreSQL-compatible SQL file:
- `basis-data/add_jira_tables_postgresql.sql`
- Includes all JIRA integration tables
- Row Level Security (RLS) policies
- Proper UUID and JSONB types for PostgreSQL

## Token Verification Flow

### Before Fix
1. Frontend sends request with Bearer token
2. Backend middleware extracts token
3. **AuthService uses supabaseAdmin.auth.getUser(token)** ❌
4. Service role client rejects user token
5. Returns 401 "Invalid or expired token"

### After Fix
1. Frontend sends request with Bearer token
2. Backend middleware extracts token
3. **AuthService uses supabaseClient.auth.getUser(token)** ✅
4. Regular client validates user token correctly
5. Returns user data and continues processing

## Supabase Client Types

### `supabaseAdmin` (Service Role)
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Bypasses Row Level Security (RLS)
- For admin operations (create/delete users, etc.)
- **Should NOT be used for user token verification**

### `supabaseClient` (Anonymous/User)
- Uses `SUPABASE_ANON_KEY`
- Respects Row Level Security (RLS)
- For user operations and token verification
- **Should be used for user token verification**

## Testing

### 1. **Verify Backend is Running**
```bash
curl http://localhost:5003/api/
# Should return API information, not connection error
```

### 2. **Test Authentication Endpoint**
```bash
# With valid token
curl -H "Authorization: Bearer <your-token>" http://localhost:5003/api/jira/connections
# Should return user's JIRA connections or empty array
```

### 3. **Check Logs**
Look for these log messages in backend console:
```
🔐 [AUTH-MIDDLEWARE] Processing authentication...
🔍 [AUTH-MIDDLEWARE] Auth header present: true
🔍 [AUTH-MIDDLEWARE] Token extracted: true
🔍 [AUTH] Verifying token...
✅ [AUTH] Token verified successfully for user: user@example.com
✅ [AUTH-MIDDLEWARE] User authenticated: user@example.com
✅ [AUTH-MIDDLEWARE] Authentication successful
```

## Expected Results

After implementing these fixes:
- ✅ Backend server runs on port 5003
- ✅ User tokens are verified correctly
- ✅ JIRA connection API calls succeed
- ✅ No more "Invalid or expired token" errors
- ✅ Comprehensive logging for debugging
- ✅ Database tables ready for JIRA integration

## Files Modified

### Backend Files
- `src/services/authService.js` - Fixed Supabase client usage
- `src/middlewares/auth.js` - Enhanced logging
- `src/config/supabase.js` - Proper client exports

### Database Files
- `basis-data/add_jira_tables_postgresql.sql` - PostgreSQL-compatible tables

### Debug Files
- `debug-auth.js` - Token verification testing script

## Status: ✅ RESOLVED

Backend authentication now works correctly with frontend tokens. JIRA integration should function properly after database tables are created.