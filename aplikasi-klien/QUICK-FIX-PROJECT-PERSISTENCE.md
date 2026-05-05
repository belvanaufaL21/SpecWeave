# Quick Fix: Project Persistence Issue

## 🔥 Problem
Project Jira kembali ke project lama setelah refresh browser.

## ⚡ Quick Solution

### 1. Timestamp Guard (Frontend)
**File**: `aplikasi-klien/src/utils/helpers/activeProjectHelpers.js`

```javascript
// Skip cleanup if data was saved in last 10 seconds
const savedTimestamp = parseInt(localStorage.getItem('activeProjectsPerChat_timestamp') || '0');
const recentlySaved = (Date.now() - savedTimestamp) < 10000;

if (recentlySaved) {
  console.log('⏭️ Skipping cleanup - data recently saved');
  return;
}
```

### 2. Save Timestamp (Frontend)
**File**: `aplikasi-klien/src/components/modals/JiraProjectManagementModal.jsx`

```javascript
// Save timestamp when user selects project
localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
localStorage.setItem('activeProjectsPerChat_timestamp', Date.now().toString());
```

### 3. Clear Old Flags (Backend)
**File**: `aplikasi-server/src/services/supabaseService.js`

```javascript
// Clear all is_active flags before setting new one
await this.admin
  .from('jira_connections')
  .update({ is_active: false })
  .eq('user_id', userId);

// Then set new active project
await this.admin
  .from('jira_connections')
  .update({ is_active: true })
  .eq('id', connectionId)
  .eq('user_id', userId);
```

### 4. Validation Layer (Frontend)
**File**: `aplikasi-klien/src/contexts/JiraContext.jsx`

```javascript
// Validate localStorage matches database
if (!recentlySaved) {
  const dbActiveProject = await UserDataService.getActiveProject();
  if (dbActiveProject.data.id !== localActiveProjectId) {
    // Update localStorage to match database
    localStorage.setItem('activeProjectsPerChat', JSON.stringify({
      ...activeProjects,
      [chatId]: dbActiveProject.data.id
    }));
  }
}
```

## 🧪 Quick Test

```bash
# 1. Select Project B
# 2. Immediately refresh (F5)
# 3. Check console:
#    ✅ Should see: "⏭️ Skipping cleanup - data recently saved"
#    ✅ Should see: "✅ localStorage and database are consistent"
# 4. Verify: Project B is still active (not reverted to Project A)
```

## 🔍 Debug Commands

```javascript
// Check localStorage
localStorage.getItem('activeProjectsPerChat')
localStorage.getItem('activeProjectsPerChat_timestamp')

// Check if timestamp guard is working
const timestamp = parseInt(localStorage.getItem('activeProjectsPerChat_timestamp') || '0');
const age = (Date.now() - timestamp) / 1000;
console.log(`Data age: ${age} seconds`);
// Should be < 10 seconds after save
```

```sql
-- Check database (should only have ONE is_active = true per user)
SELECT user_id, project_key, is_active, updated_at 
FROM jira_connections 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY updated_at DESC;
```

## 📊 Success Indicators

- ✅ Console shows: `⏭️ [CLEANUP] Skipping cleanup - data recently saved`
- ✅ Console shows: `✅ [VALIDATION] localStorage and database are consistent`
- ✅ Backend logs: `✅ [SUPABASE] Set active project: {...}`
- ✅ Database: Only ONE `is_active = true` per user
- ✅ UI: Project stays consistent after refresh

## 🚨 If Still Broken

### Check 1: Timestamp Not Saved
```javascript
// In browser console after selecting project
localStorage.getItem('activeProjectsPerChat_timestamp')
// Should return a timestamp, not null
```

### Check 2: Backend Not Clearing Flags
```sql
-- Should return 0 or 1 row per user
SELECT user_id, COUNT(*) 
FROM jira_connections 
WHERE is_active = true 
GROUP BY user_id 
HAVING COUNT(*) > 1;
```

### Check 3: Validation Not Running
```javascript
// Check console for validation logs
// Should see either:
// "⏭️ [VALIDATION] Skipping database validation - data recently saved"
// OR
// "✅ [VALIDATION] localStorage and database are consistent"
```

## 🔧 Emergency Fix

If user reports issue, manually fix their localStorage:

```javascript
// In browser console
const chatId = 'CHAT_ID'; // Get from URL
const correctProjectId = 'PROJECT_ID'; // Get from database

const activeProjects = JSON.parse(localStorage.getItem('activeProjectsPerChat') || '{}');
activeProjects[chatId] = correctProjectId;
localStorage.setItem('activeProjectsPerChat', JSON.stringify(activeProjects));
localStorage.setItem('activeProjectsPerChat_timestamp', Date.now().toString());

// Refresh page
location.reload();
```

## 📝 Files Changed

1. ✅ `aplikasi-klien/src/utils/helpers/activeProjectHelpers.js` - Timestamp guard
2. ✅ `aplikasi-klien/src/components/modals/JiraProjectManagementModal.jsx` - Save timestamp
3. ✅ `aplikasi-klien/src/contexts/JiraContext.jsx` - Validation layer + imports
4. ✅ `aplikasi-server/src/services/supabaseService.js` - Clear old flags

## 🎯 Root Cause

**Race Condition**: 
1. User saves Project B to localStorage
2. Backend API call starts (async)
3. User refreshes before backend finishes
4. `getConnections()` returns old data (Project A still `is_active`)
5. `cleanupInvalidActiveProjects()` sees Project B not in connections
6. Reverts localStorage to Project A ❌

**Solution**: Timestamp guard prevents cleanup for 10 seconds after save ✅

## 📚 Full Documentation

- `PERBAIKAN-PROJECT-PERSISTENCE-REFRESH.md` - Detailed analysis
- `SUMMARY-PERBAIKAN-PROJECT-PERSISTENCE.md` - Complete summary
- `TEST-PROJECT-PERSISTENCE.md` - Test cases
