# 🔧 Fix: Usage Limit Tidak Reset

## 📊 Masalah yang Dilaporkan

User melaporkan credit limit tidak reset dari kemarin:
- **Llama 3.3 70B**: 999997 remaining (seharusnya 999999)
- **Gemini 2.5 Flash**: 48 remaining (seharusnya 50)
- **GPT-4.1 Mini**: 27 remaining (seharusnya 30)
- **Claude 4.5 Haiku**: 18 remaining (seharusnya 20)

## 🔍 Root Cause

**Kemungkinan besar:** SQL migration untuk sistem auto-reset **belum dijalankan di production database**.

Sistem auto-reset membutuhkan:
1. ✅ Kolom `daily_limit` di tabel `models`
2. ✅ Kolom `last_reset_at` di tabel `usage_counters`
3. ✅ Fungsi `should_reset_daily_counter()`
4. ✅ Fungsi `get_remaining_requests()`
5. ✅ Fungsi `increment_usage_with_reset()`

Jika salah satu tidak ada → auto-reset tidak berfungsi.

---

## 🚀 Solusi: 3 Langkah

### Step 1: Cek Apakah Migration Sudah Dijalankan

```bash
cd aplikasi-server
node check-reset-issue.js
```

**Output yang diharapkan:**
```
✅ Function get_remaining_requests exists
✅ Column daily_limit exists in models table
✅ Database is using UTC (correct)
✅ should_reset_daily_counter(yesterday): true (correct)
✅ should_reset_daily_counter(now): false (correct)

✅ All checks passed!
```

**Jika ada ❌:**
- SQL migration belum dijalankan → Lanjut ke Step 2

---

### Step 2: Jalankan SQL Migration di Production

**⚠️ PENTING:** Migration harus dijalankan **manual** di Supabase SQL Editor (tidak bisa via API).

#### 2.1. Buka Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Pilih project SpecWeave
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**

#### 2.2. Copy SQL Migration

Buka file: `aplikasi-server/migrations/redesign-simple-limit-system.sql`

Atau copy SQL lengkap dari file tersebut (400+ lines).

#### 2.3. Run SQL

1. Paste SQL ke SQL Editor
2. Klik **Run** atau tekan `Ctrl+Enter`
3. Tunggu sampai selesai (biasanya < 5 detik)
4. Cek output - seharusnya tidak ada error

#### 2.4. Verify Migration

Run query ini di SQL Editor:

```sql
-- Cek fungsi ada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'should_reset_daily_counter',
  'get_remaining_requests',
  'increment_usage_with_reset'
);
-- Expected: 3 rows

-- Cek kolom ada
SELECT column_name 
FROM information_schema.columns 
WHERE (table_name = 'models' AND column_name = 'daily_limit')
   OR (table_name = 'usage_counters' AND column_name = 'last_reset_at');
-- Expected: 2 rows

-- Cek view ada
SELECT * FROM user_model_usage LIMIT 1;
-- Expected: 1 row (atau 0 jika belum ada user)
```

**Jika semua query berhasil → Migration sukses! ✅**

---

### Step 3: Reset Usage Counter User (Temporary Fix)

Karena user sudah pakai kemarin dan counter belum reset, kita perlu manual reset:

```bash
cd aplikasi-server
node manual-reset-user.js user@example.com
```

**Ganti `user@example.com` dengan email user yang melaporkan masalah.**

**Output:**
```
✅ Found user: user@example.com
📊 Current usage:
  Gemini 2.5 Flash:
    Used: 2/50
    Remaining: 48
    
🔄 Resetting usage counters...
✅ Successfully reset usage for user@example.com!

📊 New usage (after reset):
  Gemini 2.5 Flash:
    Used: 0/50
    Remaining: 50
```

**Setelah reset:**
1. Minta user refresh browser: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
2. User seharusnya melihat limit penuh kembali
3. Besok (midnight UTC) akan auto-reset otomatis

---

## 🔄 Cara Kerja Auto-Reset (Setelah Migration)

### Timeline Reset Otomatis

```
Hari 1 (5 Mei 2026):
├─ 00:00 UTC: Counter = 0 (reset otomatis)
├─ 10:00 UTC: User request → Counter = 1
├─ 15:00 UTC: User request → Counter = 2
└─ 23:59 UTC: Counter = 2

Hari 2 (6 Mei 2026):
├─ 00:01 UTC: User request → Counter auto-reset ke 1 ✅
├─ 10:00 UTC: User request → Counter = 2
└─ ...
```

### Kapan Reset Terjadi?

Reset **TIDAK** terjadi tepat di midnight UTC.

Reset terjadi saat:
1. User membuat request pertama di hari baru
2. Fungsi `increment_usage_with_reset()` dipanggil
3. Fungsi cek: "Apakah `last_reset_at` dari hari kemarin?"
4. Jika ya → Reset counter ke 1 (request ini)
5. Jika tidak → Increment counter biasa

**Contoh:**
- User terakhir request: 5 Mei 23:00 UTC → Counter = 10
- User tidak request sampai 6 Mei 14:00 UTC
- Saat request di 6 Mei 14:00 UTC → Counter auto-reset ke 1 ✅

---

## 🛠️ Troubleshooting

### Issue 1: "Function get_remaining_requests does not exist"

**Cause:** SQL migration belum dijalankan

**Fix:** Jalankan Step 2 (Run SQL Migration)

---

### Issue 2: "Column daily_limit does not exist"

**Cause:** SQL migration belum dijalankan atau gagal

**Fix:** 
1. Jalankan Step 2 (Run SQL Migration)
2. Jika masih error, cek error message di SQL Editor
3. Mungkin ada syntax error atau permission issue

---

### Issue 3: User masih lihat limit lama setelah reset

**Cause:** Browser cache

**Fix:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Logout dan login lagi
4. Coba browser lain (incognito mode)

---

### Issue 4: Reset tidak terjadi di midnight UTC

**Cause:** Ini **NORMAL**! Reset terjadi saat request pertama di hari baru, bukan tepat midnight.

**Explanation:**
- Sistem tidak pakai cron job
- Reset dilakukan "lazy" saat user request
- Lebih efisien dan tidak perlu background job

**Jika user tidak request sampai siang:**
- Counter masih menunjukkan nilai kemarin
- Saat request pertama → Auto-reset
- Ini by design, bukan bug

---

### Issue 5: Timezone salah

**Cause:** Database tidak pakai UTC

**Check:**
```sql
SHOW timezone;
```

**Fix:**
```sql
ALTER DATABASE your_database_name SET timezone TO 'UTC';
```

Lalu restart database connection.

---

## 📊 Monitoring Usage

### Cek Usage Semua User

```sql
SELECT 
  u.email,
  m.display_name,
  m.daily_limit,
  uc.request_count as used,
  (m.daily_limit - uc.request_count) as remaining,
  uc.last_reset_at,
  CASE 
    WHEN should_reset_daily_counter(uc.last_reset_at) THEN 'Needs Reset'
    ELSE 'OK'
  END as status
FROM usage_counters uc
JOIN auth.users u ON u.id = uc.user_id
JOIN models m ON m.id = uc.model_id
WHERE m.is_active = true
ORDER BY u.email, m.display_name;
```

### Cek User Tertentu

```sql
SELECT * FROM user_model_usage 
WHERE email = 'user@example.com';
```

### Cek Siapa yang Perlu Reset

```sql
SELECT 
  email,
  model_name,
  current_count,
  remaining,
  last_reset_at
FROM user_model_usage
WHERE needs_reset = true;
```

---

## 🚨 Emergency: Reset Semua User

**⚠️ HATI-HATI!** Ini akan reset **SEMUA** user.

```bash
cd aplikasi-server
node manual-reset-user.js --all
```

Atau via SQL:

```sql
UPDATE usage_counters
SET request_count = 0, last_reset_at = NOW();
```

---

## ✅ Verification Checklist

Setelah fix, verify dengan checklist ini:

- [ ] SQL migration berhasil dijalankan
- [ ] Fungsi `get_remaining_requests` ada
- [ ] Fungsi `increment_usage_with_reset` ada
- [ ] Fungsi `should_reset_daily_counter` ada
- [ ] Kolom `daily_limit` ada di tabel `models`
- [ ] Kolom `last_reset_at` ada di tabel `usage_counters`
- [ ] View `user_model_usage` ada
- [ ] Database timezone = UTC
- [ ] Test fungsi reset dengan query
- [ ] User counter sudah di-reset manual
- [ ] User confirm limit sudah kembali normal
- [ ] Tunggu besok untuk verify auto-reset

---

## 📝 Summary

### Masalah:
- Usage limit tidak reset dari kemarin
- User masih lihat remaining yang sama

### Root Cause:
- SQL migration belum dijalankan di production
- Fungsi auto-reset tidak ada di database

### Solusi:
1. ✅ Run SQL migration di Supabase SQL Editor
2. ✅ Manual reset user yang terdampak
3. ✅ Verify auto-reset besok

### Prevention:
- Selalu run SQL migration di production setelah deploy
- Add migration checklist ke deployment process
- Monitor usage_counters untuk detect reset issues

---

## 🆘 Need Help?

Jika masih ada masalah:

1. **Run diagnostic:**
   ```bash
   node aplikasi-server/check-reset-issue.js
   ```

2. **Check logs:**
   - Railway logs: `railway logs`
   - Supabase logs: Dashboard → Logs

3. **Manual investigation:**
   - Login ke Supabase Dashboard
   - SQL Editor → Run monitoring queries
   - Check error logs

4. **Contact:**
   - Share output dari `check-reset-issue.js`
   - Share screenshot dari user
   - Share Supabase logs jika ada error

---

**Ready to fix?** 🚀

Start with: `node aplikasi-server/check-reset-issue.js`
