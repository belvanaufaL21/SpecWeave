# 🚀 Quick Deployment Guide - 24-Hour Cooldown System

## 📋 Checklist

- [ ] Step 1: Copy SQL
- [ ] Step 2: Paste ke Supabase SQL Editor
- [ ] Step 3: Run SQL
- [ ] Step 4: Verify
- [ ] Step 5: Commit & Push
- [ ] Step 6: Test

---

## Step 1: Copy SQL

**File:** `READY-TO-PASTE-SQL.sql`

Buka file tersebut dan **copy semua isinya** (Ctrl+A, Ctrl+C)

---

## Step 2: Paste ke Supabase SQL Editor

1. Buka: https://supabase.com/dashboard
2. Pilih project **SpecWeave**
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**
5. **Paste** SQL yang sudah di-copy (Ctrl+V)

---

## Step 3: Run SQL

1. Klik tombol **Run** (atau tekan Ctrl+Enter)
2. Tunggu sampai selesai (biasanya < 5 detik)
3. Lihat output - seharusnya **Success**

**Expected output:**
```
Success. No rows returned
```

---

## Step 4: Verify

Run query ini di SQL Editor untuk verify:

```sql
-- Check if functions exist (should return 3 rows)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'should_reset_cooldown',
  'get_remaining_requests',
  'increment_usage_with_reset'
);

-- Check if view has resets_at column (should return data)
SELECT * FROM user_model_usage LIMIT 1;
```

**Expected:**
- Query 1: 3 rows (3 functions)
- Query 2: 1 row dengan kolom `resets_at`

---

## Step 5: Commit & Push

```bash
# Add all changes
git add .

# Commit
git commit -m "feat: Implement 24-hour cooldown system

- Replace daily midnight reset with 24-hour cooldown
- Add countdown timer in UI (Resets in Xh Ym)
- Hide remaining count when credit exhausted
- More fair: all users get 24 hours
- Anti-exploit: cannot use 100x in 1 hour

Backend:
- Add should_reset_cooldown() function
- Update get_remaining_requests() with cooldown logic
- Update increment_usage_with_reset() with cooldown logic
- Add resets_at to user_model_usage view
- Return resetsAt in API response

Frontend:
- Update ModelSelector to show countdown timer
- Hide remaining when exhausted
- Show 'Resets in Xh Ym' instead"

# Push
git push origin main
```

---

## Step 6: Test

### Test 1: Check API Response

```bash
# In browser console (after login)
fetch('/api/usage/limits', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(d => console.log(d))
```

**Expected:** Response should include `resetsAt` field

### Test 2: Check UI

1. Open SpecWeave app
2. Click model selector dropdown
3. Look for models with 0 remaining

**Expected:** Should show "Resets in Xh Ym" instead of "0/50 remaining"

### Test 3: Test Countdown

1. Wait 1 minute
2. Refresh page
3. Check countdown timer

**Expected:** Time should decrease (e.g., "14h 32m" → "14h 31m")

---

## ✅ Success Criteria

- [x] SQL migration runs without errors
- [x] 3 functions exist in database
- [x] View has `resets_at` column
- [x] API returns `resetsAt` in response
- [x] UI shows countdown timer when credit exhausted
- [x] UI hides "remaining" when exhausted
- [x] Countdown updates correctly

---

## 🆘 Troubleshooting

### Error: "function already exists"

**Cause:** Migration already run before

**Fix:** This is OK! The `CREATE OR REPLACE` will update the function.

---

### Error: "permission denied"

**Cause:** Not enough permissions in Supabase

**Fix:** Make sure you're logged in as project owner/admin

---

### UI still shows "0/50 remaining"

**Cause:** Frontend not deployed yet or cache

**Fix:**
1. Wait for Railway to deploy (check Railway dashboard)
2. Hard refresh: Ctrl+Shift+R
3. Clear browser cache

---

### Countdown shows "NaN" or wrong time

**Cause:** `resetsAt` not returned from backend

**Fix:**
1. Check if SQL migration added `resets_at` to view
2. Check if backend code deployed
3. Check browser console for errors

---

## 📊 What Changed

### Database:
- ✅ New function: `should_reset_cooldown()`
- ✅ Updated: `get_remaining_requests()`
- ✅ Updated: `increment_usage_with_reset()`
- ✅ Updated view: `user_model_usage` (added `resets_at`)

### Backend:
- ✅ `usageLimitService.js` returns `resetsAt`

### Frontend:
- ✅ `ModelSelector.jsx` shows countdown timer
- ✅ Hides "remaining" when exhausted

---

## 🎯 How It Works

```
User pakai 50x jam 10:00 AM
├─ last_reset_at = 10:00 AM
├─ UI shows: "Resets in 23h 59m"
└─ 24 jam kemudian (10:00 AM besok) → Auto-reset
```

**Fair untuk semua:**
- User A pakai jam 10:00 → Reset jam 10:00 besok
- User B pakai jam 23:00 → Reset jam 23:00 besok
- Semua dapat 24 jam penuh! ✅

---

## 📝 Summary

**Time needed:** ~5 minutes

**Steps:**
1. Copy SQL (1 min)
2. Paste & Run in Supabase (1 min)
3. Verify (1 min)
4. Commit & Push (1 min)
5. Test (1 min)

**Result:**
- ✅ Sistem lebih fair
- ✅ Tidak bisa di-exploit
- ✅ UI lebih jelas (countdown timer)
- ✅ User experience lebih baik

---

**Ready?** Let's go! 🚀

Start with: Open `READY-TO-PASTE-SQL.sql` and copy all content
