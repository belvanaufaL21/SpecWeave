# 🕐 24-Hour Cooldown System Design

## 🎯 Konsep

Sistem **24-hour cooldown** menggantikan sistem **daily midnight reset**.

### Perbedaan Utama:

| Aspek | Daily Midnight Reset | 24-Hour Cooldown |
|-------|---------------------|------------------|
| **Reset Time** | Midnight UTC setiap hari | 24 jam setelah `last_reset_at` |
| **Fairness** | Tidak fair (tergantung waktu pakai) | Fair (semua dapat 24 jam penuh) |
| **Exploitable** | Ya (pakai jam 23:59, reset 00:01) | Tidak |
| **Predictable** | Reset di midnight | Reset di waktu yang sama dengan kemarin |
| **Efficiency** | Reset semua user setiap hari | Hanya reset yang perlu |

---

## 📊 Cara Kerja

### Scenario 1: User Pakai Pagi

```
Senin, 10:00 AM:
├─ User pakai 50x → Habis (0/50)
├─ last_reset_at = Senin 10:00 AM
└─ Cooldown: Reset di Selasa 10:00 AM

Senin, 15:00 PM:
└─ User coba pakai → ❌ Blocked (masih cooldown)

Selasa, 09:59 AM:
└─ User coba pakai → ❌ Blocked (23h 59m passed)

Selasa, 10:00 AM:
├─ User pakai → ✅ Reset! Counter = 1
└─ last_reset_at = Selasa 10:00 AM
```

### Scenario 2: User Pakai Malam

```
Senin, 23:00 PM:
├─ User pakai 50x → Habis (0/50)
├─ last_reset_at = Senin 23:00 PM
└─ Cooldown: Reset di Selasa 23:00 PM

Selasa, 00:01 AM:
└─ User coba pakai → ❌ Blocked (baru 1 jam lewat)

Selasa, 10:00 AM:
└─ User coba pakai → ❌ Blocked (baru 11 jam lewat)

Selasa, 23:00 PM:
├─ User pakai → ✅ Reset! Counter = 1
└─ last_reset_at = Selasa 23:00 PM
```

### Scenario 3: User Tidak Habis

```
Senin, 10:00 AM:
├─ User pakai 10x → Sisa 40/50
└─ last_reset_at = Senin 10:00 AM (dari reset sebelumnya)

Selasa, 10:00 AM:
├─ 24 jam passed → Cooldown selesai
├─ User pakai → ✅ Reset! Counter = 1
└─ last_reset_at = Selasa 10:00 AM

Alternatif:
Selasa, 09:00 AM:
├─ User pakai → Counter = 11 (tidak reset, belum 24 jam)
└─ Sisa 39/50
```

---

## 🔧 Implementasi Database

### Fungsi Utama

#### 1. `should_reset_cooldown(last_reset TIMESTAMPTZ)`

```sql
CREATE OR REPLACE FUNCTION should_reset_cooldown(last_reset TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
  -- Reset if 24 hours have passed
  RETURN (NOW() - last_reset) >= INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Logic:**
- Cek apakah `NOW() - last_reset_at >= 24 hours`
- Return `true` jika sudah 24 jam
- Return `false` jika belum

#### 2. `get_remaining_requests(user_id, model_id)`

```sql
-- Check if cooldown passed
v_needs_reset := should_reset_cooldown(v_last_reset);

-- If cooldown passed, return full limit
IF v_needs_reset THEN
  RETURN v_daily_limit;
END IF;

-- Otherwise, return remaining
RETURN GREATEST(0, v_daily_limit - v_current_count);
```

**Logic:**
- Jika cooldown selesai → Return full limit
- Jika belum → Return remaining

#### 3. `increment_usage_with_reset(user_id, model_id)`

```sql
-- Check if cooldown passed
v_needs_reset := should_reset_cooldown(v_last_reset);

IF v_needs_reset THEN
  -- Reset counter to 1 (this request)
  UPDATE usage_counters
  SET request_count = 1, last_reset_at = NOW()
  WHERE user_id = p_user_id AND model_id = p_model_id;
ELSE
  -- Increment counter
  UPDATE usage_counters
  SET request_count = request_count + 1
  WHERE user_id = p_user_id AND model_id = p_model_id;
END IF;
```

**Logic:**
- Jika cooldown selesai → Reset counter ke 1, update `last_reset_at`
- Jika belum → Increment counter biasa

---

## 🎨 UI/UX Changes

### Display Remaining Time

Tambahkan info kapan reset di UI:

```jsx
// Before (Daily Reset)
<div>48/50 remaining</div>
<div>Resets at midnight UTC</div>

// After (24-Hour Cooldown)
<div>48/50 remaining</div>
<div>Resets in 14h 32m</div>
// atau
<div>Resets at May 7, 10:00 AM</div>
```

### When Credit Runs Out

```jsx
// Before
<div>0/50 remaining</div>
<div>Resets at midnight UTC</div>

// After
<div>0/50 remaining</div>
<div>Resets in 23h 45m</div>
<div className="text-xs text-gray-500">
  (May 7, 10:00 AM)
</div>
```

---

## 📈 Benefits

### 1. Fairness ✅

**Before:**
- User A pakai jam 10:00 → Dapat 14 jam sebelum reset
- User B pakai jam 23:00 → Dapat 1 jam sebelum reset
- **Tidak fair!**

**After:**
- User A pakai jam 10:00 → Dapat 24 jam penuh
- User B pakai jam 23:00 → Dapat 24 jam penuh
- **Fair untuk semua!**

### 2. Anti-Exploit ✅

**Before:**
- User pakai 50x jam 23:59
- Tunggu 1 menit
- Jam 00:01 dapat 50x lagi
- **Total: 100x dalam 2 menit!**

**After:**
- User pakai 50x jam 23:59
- Harus tunggu 24 jam
- Jam 23:59 besok baru dapat lagi
- **Total: 50x per 24 jam**

### 3. Cost-Effective ✅

**Before:**
- Semua user reset setiap midnight
- User yang tidak pakai juga di-reset
- Wasted computation

**After:**
- Hanya reset saat user request
- Lazy reset (on-demand)
- Lebih efisien

### 4. Predictable ✅

**Before:**
- User tidak tahu kapan reset
- "Kok belum reset?" (karena lazy reset)
- Confusing

**After:**
- User tahu persis kapan reset
- "Resets in 14h 32m"
- Clear dan predictable

---

## 🚀 Migration Steps

### Step 1: Backup Current Data

```sql
-- Backup usage_counters
CREATE TABLE usage_counters_backup AS
SELECT * FROM usage_counters;
```

### Step 2: Run Migration

```bash
# Run SQL migration
# File: aplikasi-server/migrations/24-hour-cooldown-system.sql
```

Di Supabase SQL Editor:
1. Copy SQL dari file migration
2. Run di SQL Editor
3. Verify functions created

### Step 3: Verify

```sql
-- Test cooldown function
SELECT should_reset_cooldown(NOW() - INTERVAL '25 hours'); -- Should be true
SELECT should_reset_cooldown(NOW() - INTERVAL '23 hours'); -- Should be false

-- Test get_remaining_requests
SELECT get_remaining_requests(
  'user-uuid',
  'model-uuid'
);

-- Check view
SELECT * FROM user_model_usage LIMIT 5;
```

### Step 4: Update Frontend

Update `ModelSelector.jsx` untuk show countdown:

```jsx
// Add resets_at to display
<div className="text-xs text-gray-500">
  {model.remaining === 0 ? (
    <span>Resets in {formatTimeRemaining(model.resets_at)}</span>
  ) : (
    <span>{model.remaining}/{model.limit} remaining</span>
  )}
</div>
```

### Step 5: Test

1. User pakai sampai habis
2. Cek `resets_at` di database
3. Tunggu 24 jam (atau manual set `last_reset_at` ke kemarin)
4. User request lagi → Should reset

---

## 🔄 Backward Compatibility

### Existing Data

Sistem baru **backward compatible** dengan data lama:

```sql
-- Old data (daily reset)
last_reset_at = '2026-05-05 00:00:00'

-- New system (24-hour cooldown)
-- Will reset 24 hours after last_reset_at
-- = '2026-05-06 00:00:00'
```

**No breaking changes!**

### Gradual Rollout

User akan gradually migrate ke sistem baru:
1. User dengan `last_reset_at` kemarin → Reset saat request berikutnya
2. User baru → Langsung pakai sistem cooldown
3. Semua user eventually pakai sistem cooldown

---

## 📊 Monitoring

### Query untuk Monitor

```sql
-- Users in cooldown
SELECT 
  email,
  model_name,
  current_count,
  last_reset_at,
  resets_at,
  (resets_at - NOW()) as time_remaining
FROM user_model_usage
WHERE remaining = 0 AND needs_reset = false
ORDER BY time_remaining;

-- Users ready to reset
SELECT 
  email,
  model_name,
  current_count,
  last_reset_at
FROM user_model_usage
WHERE needs_reset = true;

-- Average cooldown time
SELECT 
  model_name,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_reset_at)) / 3600) as avg_hours_since_reset
FROM user_model_usage
WHERE last_reset_at IS NOT NULL
GROUP BY model_name;
```

---

## ✅ Checklist

- [ ] Backup current data
- [ ] Run SQL migration
- [ ] Verify functions created
- [ ] Test cooldown logic
- [ ] Update frontend to show countdown
- [ ] Test with real user
- [ ] Monitor for 24 hours
- [ ] Verify auto-reset works
- [ ] Update documentation
- [ ] Announce to users

---

## 🆘 Rollback Plan

Jika ada masalah, rollback ke sistem lama:

```sql
-- Restore old functions
-- Copy from: aplikasi-server/migrations/redesign-simple-limit-system.sql

-- Restore data if needed
INSERT INTO usage_counters
SELECT * FROM usage_counters_backup
ON CONFLICT (user_id, model_id) DO UPDATE
SET request_count = EXCLUDED.request_count,
    last_reset_at = EXCLUDED.last_reset_at;
```

---

**Ready to implement?** 🚀

Sistem ini lebih fair, tidak bisa di-exploit, dan lebih predictable untuk user!
