# 🚀 Apply 24-Hour Cooldown System - Quick Guide

## ✅ Changes Made

### Backend:
- ✅ Updated `usageLimitService.js` to return `resetsAt`
- ✅ SQL migration ready: `24-hour-cooldown-system.sql`

### Frontend:
- ✅ Updated `ModelSelector.jsx` to show countdown timer
- ✅ Hide "remaining" when credit exhausted
- ✅ Show "Resets in Xh Ym" instead

### UI Changes:

**Before:**
```
Gemini 2.5 Flash
0/50 remaining  ← Confusing when exhausted
```

**After:**
```
Gemini 2.5 Flash
Resets in 14h 32m  ← Clear countdown
```

---

## 🚀 Deployment Steps

### Step 1: Run SQL Migration in Supabase

**⚠️ CRITICAL:** Must be done manually in Supabase SQL Editor

1. Open: https://supabase.com/dashboard
2. Select your SpecWeave project
3. Click **SQL Editor** → **New Query**
4. Copy entire SQL from: `aplikasi-server/migrations/24-hour-cooldown-system.sql`
5. Paste and click **Run**
6. Wait for completion (should be < 5 seconds)

**Verify migration:**
```sql
-- Should return 3 rows
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'should_reset_cooldown',
  'get_remaining_requests',
  'increment_usage_with_reset'
);

-- Should show resets_at column
SELECT * FROM user_model_usage LIMIT 1;
```

---

### Step 2: Commit & Push Code Changes

```bash
# Backend changes
git add aplikasi-server/src/services/usageLimitService.js
git add aplikasi-server/migrations/24-hour-cooldown-system.sql

# Frontend changes
git add aplikasi-klien/src/components/common/ModelSelector.jsx

# Documentation
git add COOLDOWN-SYSTEM-DESIGN.md
git add SWITCH-TO-COOLDOWN-SYSTEM.md
git add APPLY-COOLDOWN-SYSTEM-NOW.md

git commit -m "feat: Implement 24-hour cooldown system

- Replace daily midnight reset with 24-hour cooldown
- More fair: all users get 24 hours, not dependent on usage time
- Anti-exploit: cannot use 100x in 1 hour with midnight trick
- Better UX: show countdown timer when credit exhausted
- Hide 'remaining' count when exhausted, show 'Resets in Xh Ym'

Backend:
- Add should_reset_cooldown() function (24-hour check)
- Update get_remaining_requests() to use cooldown logic
- Update increment_usage_with_reset() to use cooldown logic
- Add resets_at column to user_model_usage view
- Return resetsAt in usageLimitService

Frontend:
- Update ModelSelector to show countdown timer
- Hide remaining count when credit exhausted
- Show 'Resets in Xh Ym' for better UX"

git push origin main
```

---

### Step 3: Verify in Local

```bash
cd aplikasi-server
node apply-cooldown-system.js
```

**Expected output:**
```
✅ Function should_reset_cooldown exists
✅ View user_model_usage is working
✅ 24-Hour Cooldown System is active!
```

---

### Step 4: Test with Real User

1. **Test Scenario 1: Credit Available**
   - User opens app
   - Should see: "48/50 remaining"
   - Normal behavior

2. **Test Scenario 2: Credit Exhausted**
   - User uses all 50 credits
   - Should see: "Resets in 23h 45m" (not "0/50 remaining")
   - Countdown updates every minute

3. **Test Scenario 3: After 24 Hours**
   - Wait 24 hours (or manually set `last_reset_at` to yesterday)
   - User makes request
   - Should auto-reset to "50/50 remaining"

---

## 🎨 UI Preview

### Dropdown with Mixed States:

```
┌─────────────────────────────────┐
│ Llama 3.3 70B                   │
│ 999997/999999 remaining         │ ← Has credit
├─────────────────────────────────┤
│ Gemini 2.5 Flash                │
│ Resets in 14h 32m               │ ← Exhausted (countdown)
├─────────────────────────────────┤
│ GPT-4.1 Mini                    │
│ 27/30 remaining                 │ ← Has credit
├─────────────────────────────────┤
│ Claude 4.5 Haiku                │
│ Resets in 2h 15m                │ ← Exhausted (countdown)
└─────────────────────────────────┘
```

---

## 📊 How It Works

### Example Timeline:

```
Monday 10:00 AM:
├─ User uses 50/50 credits → Exhausted
├─ last_reset_at = Monday 10:00 AM
├─ UI shows: "Resets in 23h 59m"
└─ User cannot use this model

Monday 11:00 AM:
├─ UI shows: "Resets in 22h 59m"
└─ Countdown updates

Tuesday 09:59 AM:
├─ UI shows: "Resets in 1m"
└─ Almost ready

Tuesday 10:00 AM:
├─ User makes request → Auto-reset!
├─ Counter = 1
├─ last_reset_at = Tuesday 10:00 AM
└─ UI shows: "49/50 remaining"
```

---

## ✅ Verification Checklist

After deployment:

- [ ] SQL migration run successfully in Supabase
- [ ] Functions exist: `should_reset_cooldown`, `get_remaining_requests`, `increment_usage_with_reset`
- [ ] View `user_model_usage` has `resets_at` column
- [ ] Backend returns `resetsAt` in API response
- [ ] Frontend shows countdown when credit exhausted
- [ ] Frontend hides "remaining" when exhausted
- [ ] Countdown updates correctly
- [ ] Auto-reset works after 24 hours
- [ ] No breaking changes for existing users

---

## 🆘 Troubleshooting

### Issue: "Function should_reset_cooldown does not exist"

**Cause:** SQL migration not run yet

**Fix:** Run SQL migration in Supabase SQL Editor (Step 1)

---

### Issue: Frontend still shows "0/50 remaining"

**Cause:** Frontend not updated or cache

**Fix:**
1. Hard refresh: `Ctrl+Shift+R`
2. Clear browser cache
3. Check if code deployed to Railway

---

### Issue: Countdown shows "NaN" or wrong time

**Cause:** `resetsAt` not returned from backend

**Fix:**
1. Check if SQL migration added `resets_at` to view
2. Check if backend returns `resetsAt` in response
3. Check browser console for errors

---

### Issue: Auto-reset not working after 24 hours

**Cause:** User hasn't made request yet (lazy reset)

**Explanation:** Reset only happens when user makes request, not automatically at 24-hour mark. This is by design (lazy reset).

**Fix:** User needs to make a request to trigger reset.

---

## 📝 Summary

**What changed:**
- ❌ Old: Reset at midnight UTC every day
- ✅ New: Reset 24 hours after last reset

**Benefits:**
- ✅ Fair for all users (everyone gets 24 hours)
- ✅ Cannot be exploited (no midnight trick)
- ✅ Better UX (countdown timer)
- ✅ More efficient (lazy reset)

**Migration:**
1. Run SQL in Supabase SQL Editor
2. Commit & push code changes
3. Verify with script
4. Test with real user

---

**Ready to deploy?** 🚀

All code is ready, just need to run SQL migration in Supabase!
