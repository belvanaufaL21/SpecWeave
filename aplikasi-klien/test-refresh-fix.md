# Test Plan: Refresh Fix Verification

## Quick Test (5 menit)

### Test 1: Basic Refresh
1. Buka aplikasi di browser
2. Login
3. Tekan F5 atau Ctrl+R
4. **Expected:** UI langsung muncul, tidak stuck

### Test 2: Refresh dengan Chat Active
1. Buka chat dengan ID: `/chat?id=123`
2. Tekan F5
3. **Expected:** Chat tetap terbuka, messages muncul

### Test 3: Spam Refresh
1. Tekan F5 berulang kali (5-10 kali cepat)
2. **Expected:** Tidak crash, tidak stuck

## Detailed Test (15 menit)

### Test 4: Slow Network
1. Buka DevTools → Network → Throttling → Slow 3G
2. Refresh halaman
3. **Expected:** UI tetap responsive, data loading di background

### Test 5: Server Offline
1. Stop backend server
2. Refresh halaman
3. **Expected:** UI muncul dengan graceful error handling

### Test 6: With Jira Context
1. Setup Jira connection
2. Select Epic
3. Refresh halaman
4. **Expected:** Jira connection dan Epic context tetap ada

### Test 7: Multiple Tabs
1. Buka aplikasi di 2 tabs
2. Refresh kedua tabs secara bersamaan
3. **Expected:** Kedua tabs berfungsi normal

## Debug Checklist

Jika masih ada masalah, check:

### Console Logs
```javascript
// Should NOT see:
"⏳ [JIRA-CONTEXT] Initial data loading already in progress" (berulang)
"Epic context refresh blocked" (terus menerus)

// Should see:
"🔥 [NUCLEAR] ENHANCED refresh connections"
"✅ [NUCLEAR] Got connections from JiraService"
```

### React DevTools
1. Check `JiraContext` state:
   - `isLoadingConnections` should NOT exist
   - `isLoadingEpic` should NOT exist
   - `connections` should be array
   - `epicContext` should be object or null

2. Check `ChatContext` state:
   - `isInitialized` should be `true` after first load
   - `chats` should be object
   - `history` should be array

### Network Tab
1. Check API calls:
   - `/api/jira/connections` should complete (even if error)
   - `/api/jira/epic-context` should complete (even if error)
   - No hanging requests

## Success Criteria

✅ UI renders immediately on refresh
✅ No infinite loading spinners
✅ No console errors (except expected network errors)
✅ Data appears within 3 seconds
✅ Can interact with UI immediately
✅ No memory leaks (check with React DevTools Profiler)

## Failure Indicators

❌ White screen for >2 seconds
❌ Loading spinner never disappears
❌ Console shows repeated initialization logs
❌ Cannot click buttons
❌ Browser tab freezes
❌ Memory usage keeps increasing

## Rollback Trigger

If ANY of these occur:
- Data loss after refresh
- Authentication broken
- Chat messages disappear
- Jira connections lost
- Epic context cleared unexpectedly

→ Immediately rollback and investigate
