# 🔄 Switch to 24-Hour Cooldown System

## 🎯 Apa yang Berubah?

### ❌ Sistem Lama (Daily Midnight Reset)
```
Senin 23:00 → User pakai 50x → Habis
Selasa 00:01 → Reset otomatis → Dapat 50x lagi
Total: 100x dalam 1 jam! (Bisa di-exploit)
```

### ✅ Sistem Baru (24-Hour Cooldown)
```
Senin 23:00 → User pakai 50x → Habis
Selasa 00:01 → Masih habis (baru 1 jam)
Selasa 23:00 → Reset! → Dapat 50x lagi
Total: 50x per 24 jam (Fair untuk semua)
```

---

## 🚀 Cara Apply

### Step 1: Run SQL Migration

**⚠️ PENTING:** Harus manual di Supabase SQL Editor

1. Buka: https://supabase.com/dashboard
2. Pilih project SpecWeave
3. Klik **SQL Editor** → **New Query**
4. Copy SQL dari: `aplikasi-server/migrations/24-hour-cooldown-system.sql`
5. Paste dan **Run**

### Step 2: Verify Migration

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

### Step 3: Test

1. User pakai credit sampai habis
2. Cek `resets_at` di database
3. Tunggu 24 jam (atau manual set `last_reset_at` ke kemarin untuk test)
4. User request lagi → Should reset

---

## 📊 Perbandingan

| Fitur | Daily Reset | 24-Hour Cooldown |
|-------|-------------|------------------|
| **Reset Time** | Midnight UTC | 24 jam setelah last reset |
| **Fair?** | ❌ Tidak (tergantung waktu pakai) | ✅ Ya (semua dapat 24 jam) |
| **Exploitable?** | ✅ Ya (pakai jam 23:59) | ❌ Tidak |
| **Predictable?** | ❌ Tidak jelas | ✅ Jelas (countdown timer) |
| **Efficient?** | ❌ Reset semua user | ✅ Reset on-demand |

---

## 🎨 UI Changes (Optional)

Update `ModelSelector.jsx` untuk show countdown:

```jsx
// Show remaining time instead of just count
{model.remaining === 0 ? (
  <div>
    <div>0/{model.limit} remaining</div>
    <div className="text-xs text-gray-500">
      Resets in {formatTimeRemaining(model.resets_at)}
    </div>
  </div>
) : (
  <div>{model.remaining}/{model.limit} remaining</div>
)}
```

Helper function:

```javascript
function formatTimeRemaining(resetsAt) {
  if (!resetsAt) return 'N/A';
  
  const now = new Date();
  const reset = new Date(resetsAt);
  const diff = reset - now;
  
  if (diff <= 0) return 'Ready to reset';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}
```

---

## ✅ Benefits

### 1. Fairness
- Semua user dapat 24 jam penuh
- Tidak tergantung waktu pakai

### 2. Anti-Exploit
- Tidak bisa "game the system"
- Tidak bisa pakai 100x dalam 1 jam

### 3. Predictable
- User tahu persis kapan reset
- Countdown timer di UI

### 4. Cost-Effective
- Hanya reset yang perlu
- Lebih efisien

---

## 🔄 Backward Compatible

Sistem baru **tidak break** data lama:
- Existing `last_reset_at` tetap valid
- User gradually migrate ke sistem baru
- No data loss

---

## 📊 Monitoring

```sql
-- Users in cooldown
SELECT 
  email,
  model_name,
  remaining,
  resets_at,
  (resets_at - NOW()) as time_remaining
FROM user_model_usage
WHERE remaining = 0
ORDER BY time_remaining;

-- Users ready to reset
SELECT 
  email,
  model_name,
  current_count,
  last_reset_at
FROM user_model_usage
WHERE needs_reset = true;
```

---

## 🆘 Rollback

Jika ada masalah, rollback ke sistem lama:

```sql
-- Run old migration
-- File: aplikasi-server/migrations/redesign-simple-limit-system.sql
```

---

## 📝 Summary

**Sistem lama:** Reset di midnight UTC setiap hari
**Sistem baru:** Reset 24 jam setelah last reset

**Keuntungan:**
- ✅ Lebih fair
- ✅ Tidak bisa di-exploit
- ✅ Lebih predictable
- ✅ Lebih efisien

**Migration:**
1. Run SQL di Supabase SQL Editor
2. Verify dengan script
3. Test dengan user
4. (Optional) Update UI untuk show countdown

---

**Ready to switch?** 🚀

Sistem ini akan membuat SpecWeave lebih fair dan professional!
