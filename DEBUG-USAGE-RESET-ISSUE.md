# 🐛 Debug: Usage Limit Tidak Reset

## 📊 Data dari Screenshot

User melaporkan credit limit tidak reset dari kemarin:
- **Llama 3.3 70B**: 999997 remaining (seharusnya 999999 - unlimited)
- **Gemini 2.5 Flash**: 48 remaining (seharusnya 50)
- **GPT-4.1 Mini**: 27 remaining (seharusnya 30)
- **Claude 4.5 Haiku**: 18 remaining (seharusnya 20)

## 🔍 Kemungkinan Penyebab

### 1. ❌ SQL Migration Belum Dijalankan di Production

**Paling Mungkin!** Fungsi `get_remaining_requests()` dan `increment_usage_with_reset()` belum ada di production database.

**Cara Cek:**
```sql
-- Cek apakah fungsi ada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'should_reset_daily_counter',
  'get_remaining_requests',
  'increment_usage_with_reset'
);

-- Cek apakah kolom last_reset_at ada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'usage_counters' 
  AND column_name = 'last_reset_at';

-- Cek apakah kolom daily_limit ada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'models' 
  AND column_name = 'daily_limit';
```

**Solusi:**
Run SQL migration di Supabase SQL Editor (production):
- File: `aplikasi-server/migrations/redesign-simple-limit-system.sql`

---

### 2. ⚠️ Fungsi Reset Tidak Dipanggil

Jika fungsi sudah ada tapi tidak dipanggil dengan benar.

**Cara Cek:**
```sql
-- Lihat data usage_counters user
SELECT 
  uc.user_id,
  u.email,
  m.name as model_name,
  m.display_name,
  m.daily_limit,
  uc.request_count,
  uc.last_reset_at,
  NOW() as current_time,
  DATE(uc.last_reset_at AT TIME ZONE 'UTC') as reset_date,
  DATE(NOW() AT TIME ZONE 'UTC') as current_date,
  should_reset_daily_counter(uc.last_reset_at) as needs_reset
FROM usage_counters uc
JOIN auth.users u ON u.id = uc.user_id
JOIN models m ON m.id = uc.model_id
WHERE u.email = 'user@example.com'; -- Ganti dengan email user yang melaporkan
```

**Expected:**
- Jika `needs_reset = true` → Fungsi reset tidak dipanggil saat request
- Jika `last_reset_at` masih kemarin → Counter belum di-reset

---

### 3. 🕐 Timezone Issue

Fungsi `should_reset_daily_counter` menggunakan UTC, tapi server/database pakai timezone lain.

**Cara Cek:**
```sql
-- Cek timezone database
SHOW timezone;

-- Cek apakah fungsi reset bekerja
SELECT 
  NOW() as now_local,
  NOW() AT TIME ZONE 'UTC' as now_utc,
  DATE(NOW() AT TIME ZONE 'UTC') as date_utc,
  should_reset_daily_counter('2026-05-05 00:00:00+00'::timestamptz) as should_reset_yesterday,
  should_reset_daily_counter(NOW() - INTERVAL '1 day') as should_reset_1day_ago,
  should_reset_daily_counter(NOW()) as should_reset_now;
```

**Expected:**
- `should_reset_yesterday = true`
- `should_reset_1day_ago = true`
- `should_reset_now = false`

---

### 4. 🔄 Frontend Cache

Frontend masih menampilkan data lama dari cache/localStorage.

**Cara Cek:**
- Buka DevTools → Application → Local Storage
- Cari key yang menyimpan usage data
- Clear dan refresh

**Solusi:**
- Hard refresh: `Ctrl+Shift+R` atau `Cmd+Shift+R`
- Clear browser cache

---

### 5. 📡 API Tidak Memanggil Fungsi Database

Service `usageLimitService.js` tidak memanggil `get_remaining_requests()` dengan benar.

**Cara Cek:**
```javascript
// Di aplikasi-server/src/services/usageLimitService.js
// Line 62-67

const { data: remainingData, error: remainingError } = await client
  .rpc('get_remaining_requests', {
    p_user_id: userId,
    p_model_id: model.id
  });
```

**Cek Log Server:**
- Apakah ada error saat call `get_remaining_requests`?
- Apakah fungsi dipanggil dengan parameter yang benar?

---

## 🚀 Langkah Debugging

### Step 1: Cek Production Database

Login ke Supabase Dashboard → SQL Editor → Run:

```sql
-- 1. Cek fungsi ada
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%reset%' OR routine_name LIKE '%remaining%';

-- 2. Cek kolom ada
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE (table_name = 'usage_counters' AND column_name = 'last_reset_at')
   OR (table_name = 'models' AND column_name = 'daily_limit');

-- 3. Cek data user (ganti email)
SELECT 
  u.email,
  m.display_name,
  m.daily_limit,
  uc.request_count,
  uc.last_reset_at,
  should_reset_daily_counter(uc.last_reset_at) as needs_reset
FROM usage_counters uc
JOIN auth.users u ON u.id = uc.user_id
JOIN models m ON m.id = uc.model_id
WHERE u.email = 'your-email@example.com'
ORDER BY m.display_name;
```

### Step 2: Manual Reset (Temporary Fix)

Jika user butuh reset sekarang:

```sql
-- Reset semua counter user tertentu
UPDATE usage_counters
SET request_count = 0, last_reset_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'user@example.com'
);
```

### Step 3: Deploy SQL Migration

Jika fungsi belum ada di production:

1. Buka Supabase Dashboard
2. SQL Editor → New Query
3. Copy dari: `aplikasi-server/migrations/redesign-simple-limit-system.sql`
4. Run
5. Verify dengan query di Step 1

### Step 4: Test Auto-Reset

Setelah migration:

```sql
-- Test fungsi reset
SELECT should_reset_daily_counter('2026-05-05 00:00:00+00'::timestamptz); -- Should be true
SELECT should_reset_daily_counter(NOW()); -- Should be false

-- Test get_remaining_requests
SELECT get_remaining_requests(
  (SELECT id FROM auth.users WHERE email = 'user@example.com'),
  (SELECT id FROM models WHERE name = 'google/gemini-2.5-flash')
);
```

---

## ✅ Solusi Permanen

### Jika SQL Migration Belum Dijalankan:

1. **Run SQL Migration di Production**
   - File: `aplikasi-server/migrations/redesign-simple-limit-system.sql`
   - Location: Supabase Dashboard → SQL Editor

2. **Verify Deployment**
   ```sql
   SELECT * FROM user_model_usage LIMIT 5;
   ```

3. **Test dengan User**
   - User refresh browser
   - Cek apakah remaining count benar
   - Tunggu sampai midnight UTC besok
   - Verify auto-reset bekerja

### Jika Fungsi Sudah Ada Tapi Tidak Bekerja:

1. **Cek Log Server**
   - Railway logs atau local logs
   - Cari error terkait `get_remaining_requests`

2. **Cek Timezone**
   ```sql
   SHOW timezone;
   -- Jika bukan UTC, set ke UTC
   ALTER DATABASE your_db_name SET timezone TO 'UTC';
   ```

3. **Manual Test Fungsi**
   ```sql
   -- Test increment dengan reset
   SELECT * FROM increment_usage_with_reset(
     'user-uuid-here',
     'model-uuid-here'
   );
   ```

---

## 📝 Checklist

- [ ] Cek fungsi database ada di production
- [ ] Cek kolom `last_reset_at` dan `daily_limit` ada
- [ ] Cek data `usage_counters` user
- [ ] Cek timezone database (harus UTC)
- [ ] Test fungsi `should_reset_daily_counter`
- [ ] Test fungsi `get_remaining_requests`
- [ ] Manual reset untuk user (temporary)
- [ ] Deploy SQL migration jika belum
- [ ] Verify auto-reset besok

---

## 🆘 Quick Fix untuk User

Jika user butuh reset sekarang (sementara):

```sql
-- Reset user tertentu
UPDATE usage_counters
SET request_count = 0, last_reset_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

Atau reset semua user:

```sql
-- Reset semua user (hati-hati!)
UPDATE usage_counters
SET request_count = 0, last_reset_at = NOW();
```

---

**Next Action:** Cek production database dengan query di Step 1 untuk identify root cause.
