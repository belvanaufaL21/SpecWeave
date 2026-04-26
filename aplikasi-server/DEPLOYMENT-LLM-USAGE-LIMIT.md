# Deployment Guide: LLM Usage Limit System

## Overview
Panduan ini membantu Anda menerapkan LLM Usage Limit System ke production database dan memastikan semua pengguna dapat menggunakannya.

## Prerequisites
- [x] Migration file sudah dibuat: `migrations/add-llm-usage-limit-system.sql`
- [x] GEMINI_API_KEY sudah ada di `.env`
- [x] Kode backend sudah terintegrasi dengan sistem baru
- [x] Frontend sudah memiliki ModelSelector UI

## Deployment Steps

### Step 1: Backup Database (PENTING!)
Sebelum menjalankan migration, backup database Anda terlebih dahulu.

```sql
-- Di Supabase Dashboard > SQL Editor, jalankan:
-- Ini akan membuat snapshot dari tabel yang akan dimodifikasi
CREATE TABLE IF NOT EXISTS backup_users_$(date +%Y%m%d) AS SELECT * FROM auth.users;
```

### Step 2: Run Migration di Supabase

1. **Buka Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/nthylrvtkaqqixznrtaj
   - Login dengan akun Anda

2. **Navigate ke SQL Editor**
   - Klik "SQL Editor" di sidebar kiri
   - Klik "New Query"

3. **Copy Migration SQL**
   - Buka file: `aplikasi-server/migrations/add-llm-usage-limit-system.sql`
   - Copy seluruh isi file

4. **Paste dan Execute**
   - Paste SQL ke editor
   - Klik "Run" atau tekan Ctrl+Enter
   - Tunggu hingga selesai (biasanya < 5 detik)

5. **Verify Migration Success**
   Jalankan query berikut untuk memverifikasi:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('model_tiers', 'models', 'usage_counters', 'usage_history');

-- Should return 4 rows:
-- model_tiers
-- models
-- usage_counters
-- usage_history
```

### Step 3: Verify Seed Data

Jalankan query berikut untuk memastikan data seed sudah masuk:

```sql
-- Check model tiers (should return 3 rows)
SELECT name, request_limit, description FROM model_tiers ORDER BY request_limit DESC;

-- Expected output:
-- economy  | 50 | Low-cost models with highest request limit
-- standard | 10 | Mid-tier models with moderate request limit
-- premium  | 1  | High-cost models with lowest request limit

-- Check models (should return 3 rows)
SELECT 
  m.name, 
  m.display_name, 
  m.provider, 
  mt.name as tier, 
  mt.request_limit
FROM models m
JOIN model_tiers mt ON m.tier_id = mt.id
ORDER BY mt.request_limit DESC;

-- Expected output:
-- llama-3.1-8b-instant | Llama 3.1 8B      | groq   | economy  | 50
-- gemini-2.5-flash     | Gemini 2.5 Flash  | gemini | standard | 10
-- gemini-2.5-pro       | Gemini 2.5 Pro    | gemini | premium  | 1
```

### Step 4: Update Environment Variables di Railway

1. **Buka Railway Dashboard**
   - URL: https://railway.app/
   - Pilih project "specweave-server"

2. **Add GEMINI_API_KEY**
   - Klik tab "Variables"
   - Klik "New Variable"
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSyCRqEoqiZL3QvPvXfrZd3weB_LnMwLu83s` (atau key baru jika ada)
   - Klik "Add"

3. **Verify Other Variables**
   Pastikan variable berikut sudah ada:
   - `GROQ_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Deploy**
   - Railway akan otomatis redeploy setelah menambah variable
   - Tunggu hingga deployment selesai (~2-3 menit)

### Step 5: Test API Endpoints

Setelah deployment selesai, test endpoint baru:

#### Test 1: Get Usage Limits
```bash
curl -X GET https://specweave-server-production.up.railway.app/api/usage/limits \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "models": [
    {
      "id": "uuid",
      "name": "llama-3.1-8b-instant",
      "displayName": "Llama 3.1 8B",
      "provider": "groq",
      "tier": "economy",
      "limit": 50,
      "used": 0,
      "remaining": 50
    },
    {
      "id": "uuid",
      "name": "gemini-2.5-flash",
      "displayName": "Gemini 2.5 Flash",
      "provider": "gemini",
      "tier": "standard",
      "limit": 10,
      "used": 0,
      "remaining": 10
    },
    {
      "id": "uuid",
      "name": "gemini-2.5-pro",
      "displayName": "Gemini 2.5 Pro",
      "provider": "gemini",
      "tier": "premium",
      "limit": 1,
      "used": 0,
      "remaining": 1
    }
  ]
}
```

#### Test 2: Generate Gherkin with Model Selection
```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user, I want to login",
    "model": "llama-3.1-8b-instant"
  }'
```

Expected response should include usage info:
```json
{
  "gherkin": "...",
  "usage": {
    "model": "llama-3.1-8b-instant",
    "displayName": "Llama 3.1 8B",
    "provider": "groq",
    "tier": "economy",
    "remaining": 49,
    "limit": 50
  }
}
```

### Step 6: Test Frontend

1. **Buka aplikasi client**
   - URL: https://specweave-client-production.up.railway.app
   - Login dengan akun test

2. **Verify ModelSelector muncul**
   - Buka halaman Chat/Generate
   - Pastikan ada dropdown untuk memilih model
   - Pastikan menampilkan 3 model dengan limit masing-masing

3. **Test Generate dengan berbagai model**
   - Pilih "Llama 3.1 8B" → Generate → Verify berhasil
   - Pilih "Gemini 2.5 Flash" → Generate → Verify berhasil
   - Pilih "Gemini 2.5 Pro" → Generate → Verify berhasil

4. **Test Limit Enforcement**
   - Generate dengan "Gemini 2.5 Pro" sebanyak 1x
   - Coba generate lagi → Harus muncul error 429 dengan saran model alternatif

### Step 7: Monitor Logs

Setelah deployment, monitor logs untuk memastikan tidak ada error:

```bash
# Di Railway Dashboard
# Klik tab "Deployments" → Klik deployment terbaru → Klik "View Logs"

# Look for:
# ✓ "LLM Provider Service initialized"
# ✓ "Usage Limit Service initialized"
# ✓ Successful API calls to /api/usage/limits
# ✓ Successful API calls to /api/gherkin/generate with usage info
```

## Rollback Plan

Jika terjadi masalah, rollback dengan cara:

### Option 1: Rollback Migration (Hapus tabel baru)
```sql
-- Di Supabase SQL Editor
DROP TABLE IF EXISTS usage_history CASCADE;
DROP TABLE IF EXISTS usage_counters CASCADE;
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS model_tiers CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
```

### Option 2: Rollback Code (Revert ke commit sebelumnya)
```bash
# Di Railway Dashboard
# Klik tab "Deployments"
# Pilih deployment sebelumnya yang stabil
# Klik "Redeploy"
```

## Troubleshooting

### Issue 1: Migration gagal dengan error "relation already exists"
**Solution**: Tabel sudah ada, skip migration atau drop tabel terlebih dahulu.

### Issue 2: API endpoint /api/usage/limits return 500
**Solution**: 
- Check Railway logs untuk error detail
- Verify GEMINI_API_KEY sudah di-set
- Verify migration sudah dijalankan dengan benar

### Issue 3: Frontend tidak menampilkan ModelSelector
**Solution**:
- Clear browser cache
- Check browser console untuk error
- Verify API endpoint /api/usage/limits return data dengan benar

### Issue 4: Gemini API return error "API key not valid"
**Solution**:
- Verify GEMINI_API_KEY di Railway environment variables
- Generate new API key di https://aistudio.google.com/app/apikey
- Update GEMINI_API_KEY di Railway

## Post-Deployment Checklist

- [ ] Migration berhasil dijalankan di Supabase
- [ ] Seed data (3 tiers, 3 models) sudah masuk
- [ ] GEMINI_API_KEY sudah di-set di Railway
- [ ] Server berhasil redeploy di Railway
- [ ] API endpoint /api/usage/limits return data dengan benar
- [ ] API endpoint /api/gherkin/generate dengan model selection berfungsi
- [ ] Frontend ModelSelector muncul dan berfungsi
- [ ] Limit enforcement berfungsi (429 error ketika limit tercapai)
- [ ] Usage counter increment dengan benar setelah generate
- [ ] Logs tidak menunjukkan error

## Success Criteria

Sistem dianggap berhasil di-deploy jika:
1. ✅ Semua pengguna dapat melihat 3 model di ModelSelector
2. ✅ Pengguna dapat generate dengan model apapun yang masih ada quota
3. ✅ Sistem menolak request ketika limit tercapai dengan error message yang jelas
4. ✅ Sistem menyarankan model alternatif ketika limit tercapai
5. ✅ Usage counter update dengan benar setelah setiap request
6. ✅ Tidak ada error di logs

## Next Steps

Setelah deployment berhasil:
1. Monitor usage patterns untuk 1-2 hari
2. Adjust limits jika diperlukan (edit `model_tiers.request_limit`)
3. Add model baru jika diperlukan (INSERT ke tabel `models`)
4. Setup monitoring/alerting untuk usage anomalies

## Support

Jika ada pertanyaan atau masalah:
1. Check logs di Railway Dashboard
2. Check database di Supabase Dashboard
3. Review requirements di `.kiro/specs/llm-usage-limit-system/requirements.md`
4. Review tasks di `.kiro/specs/llm-usage-limit-system/tasks.md`
