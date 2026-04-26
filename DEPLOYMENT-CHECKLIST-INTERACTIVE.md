# ✅ Interactive Deployment Checklist

Copy checklist ini dan tandai setiap step saat Anda menyelesaikannya.

---

## 🚀 Pre-Deployment Checks

- [ ] Baca [`DEPLOYMENT-READY-SUMMARY.md`](DEPLOYMENT-READY-SUMMARY.md)
- [ ] Run `npm run check:llm-system` di `aplikasi-server/`
- [ ] Verify readiness check passed (minimal 83%)
- [ ] Backup database (optional tapi recommended)

---

## 📋 Step 1: Database Migration (2 menit)

### 1.1 Open Supabase Dashboard
- [ ] Buka browser
- [ ] Navigate ke: https://supabase.com/dashboard/project/nthylrvtkaqqixznrtaj
- [ ] Login jika belum

### 1.2 Open SQL Editor
- [ ] Klik "SQL Editor" di sidebar kiri
- [ ] Klik "New Query" button

### 1.3 Run Migration
- [ ] Buka file: `aplikasi-server/migrations/add-llm-usage-limit-system.sql`
- [ ] Copy seluruh isi file (Ctrl+A, Ctrl+C)
- [ ] Paste ke SQL Editor (Ctrl+V)
- [ ] Klik "Run" button atau tekan Ctrl+Enter
- [ ] Tunggu hingga selesai (~5 detik)
- [ ] Verify: Muncul "Success" message

### 1.4 Verify Migration
- [ ] Di SQL Editor yang sama, clear query
- [ ] Copy-paste query berikut:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('model_tiers', 'models', 'usage_counters', 'usage_history');
```
- [ ] Klik "Run"
- [ ] Verify: Return 4 rows (4 tabel baru)

### 1.5 Verify Seed Data
- [ ] Clear query lagi
- [ ] Copy-paste query berikut:
```sql
SELECT name, request_limit FROM model_tiers ORDER BY request_limit DESC;
```
- [ ] Klik "Run"
- [ ] Verify: Return 3 rows (economy: 50, standard: 10, premium: 1)

- [ ] Clear query lagi
- [ ] Copy-paste query berikut:
```sql
SELECT m.name, m.display_name, m.provider, mt.name as tier 
FROM models m 
JOIN model_tiers mt ON m.tier_id = mt.id;
```
- [ ] Klik "Run"
- [ ] Verify: Return 3 rows (llama, gemini-flash, gemini-pro)

### 1.6 Optional: Run Full Verification
- [ ] Buka file: `aplikasi-server/scripts/verify-llm-usage-system.sql`
- [ ] Copy seluruh isi file
- [ ] Paste ke SQL Editor
- [ ] Klik "Run"
- [ ] Review output: Semua checks harus passed

---

## 🚂 Step 2: Railway Environment Update (2 menit)

### 2.1 Open Railway Dashboard
- [ ] Buka browser tab baru
- [ ] Navigate ke: https://railway.app/
- [ ] Login jika belum

### 2.2 Select Project
- [ ] Klik project "specweave-server"
- [ ] Verify: Anda di halaman project yang benar

### 2.3 Open Variables Tab
- [ ] Klik tab "Variables" di top navigation
- [ ] Verify: Melihat list environment variables

### 2.4 Check Existing Variables
- [ ] Verify variable exists: `GROQ_API_KEY`
- [ ] Verify variable exists: `SUPABASE_URL`
- [ ] Verify variable exists: `SUPABASE_ANON_KEY`
- [ ] Verify variable exists: `SUPABASE_SERVICE_ROLE_KEY`

### 2.5 Add GEMINI_API_KEY
- [ ] Klik button "New Variable"
- [ ] Di field "Name", ketik: `GEMINI_API_KEY`
- [ ] Di field "Value", paste: `AIzaSyCRqEoqiZL3QvPvXfrZd3weB_LnMwLu83s`
- [ ] Klik "Add" button
- [ ] Verify: Variable muncul di list

### 2.6 Wait for Auto-Redeploy
- [ ] Klik tab "Deployments"
- [ ] Verify: New deployment triggered (status: "Building" atau "Deploying")
- [ ] Wait: Hingga status berubah menjadi "Success" (~2-3 menit)
- [ ] Note deployment time: ___:___ (untuk reference)

---

## 🧪 Step 3: API Testing (1 menit)

### 3.1 Get Access Token
- [ ] Buka aplikasi client: https://specweave-client-production.up.railway.app
- [ ] Login dengan akun test
- [ ] Buka browser console (F12)
- [ ] Run command: `localStorage.getItem('supabase.auth.token')`
- [ ] Copy access token (atau gunakan method lain untuk get token)
- [ ] Save token untuk testing: `YOUR_TOKEN = _______________`

### 3.2 Test Usage Limits Endpoint
- [ ] Buka terminal atau Postman
- [ ] Run command:
```bash
curl -X GET https://specweave-server-production.up.railway.app/api/usage/limits \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Verify response:
  - [ ] Status code: 200
  - [ ] Response contains "models" array
  - [ ] Array has 3 items
  - [ ] Each item has: name, displayName, provider, tier, limit, used, remaining
  - [ ] Limits are: 50, 10, 1

### 3.3 Test Generate with Llama (Economy)
- [ ] Run command:
```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userStory": "As a user, I want to login", "model": "llama-3.1-8b-instant"}'
```
- [ ] Verify response:
  - [ ] Status code: 200
  - [ ] Response contains "gherkin" field
  - [ ] Response contains "usage" object
  - [ ] usage.model = "llama-3.1-8b-instant"
  - [ ] usage.remaining = 49 (atau 50 - jumlah request yang sudah dilakukan)
  - [ ] usage.limit = 50

### 3.4 Test Generate with Gemini Flash (Standard)
- [ ] Run command:
```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userStory": "As a user, I want to login", "model": "gemini-2.5-flash"}'
```
- [ ] Verify response:
  - [ ] Status code: 200
  - [ ] Response contains "gherkin" field
  - [ ] usage.model = "gemini-2.5-flash"
  - [ ] usage.remaining = 9
  - [ ] usage.limit = 10

### 3.5 Test Generate with Gemini Pro (Premium)
- [ ] Run command:
```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userStory": "As a user, I want to login", "model": "gemini-2.5-pro"}'
```
- [ ] Verify response:
  - [ ] Status code: 200
  - [ ] Response contains "gherkin" field
  - [ ] usage.model = "gemini-2.5-pro"
  - [ ] usage.remaining = 0
  - [ ] usage.limit = 1

### 3.6 Test Limit Enforcement
- [ ] Run command lagi (generate dengan gemini-pro yang sudah habis):
```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userStory": "As a user, I want to login", "model": "gemini-2.5-pro"}'
```
- [ ] Verify response:
  - [ ] Status code: 429
  - [ ] Response contains "error" field
  - [ ] Error message mentions "limit reached"
  - [ ] Response contains "alternatives" array
  - [ ] Alternatives include models with remaining > 0

---

## 🎨 Step 4: Frontend Testing (2 menit)

### 4.1 Open Client Application
- [ ] Buka browser
- [ ] Navigate ke: https://specweave-client-production.up.railway.app
- [ ] Login dengan akun test (jika belum)

### 4.2 Navigate to Chat/Generate Page
- [ ] Klik menu untuk Chat atau Generate page
- [ ] Verify: Halaman loaded dengan benar

### 4.3 Verify ModelSelector Component
- [ ] Verify: Ada dropdown untuk model selection
- [ ] Verify: Dropdown menampilkan 3 models
- [ ] Verify: Setiap model menampilkan:
  - [ ] Display name (Llama 3.1 8B, Gemini 2.5 Flash, Gemini 2.5 Pro)
  - [ ] Tier (Economy, Standard, Premium)
  - [ ] Usage info (X/Y requests)

### 4.4 Test Generate with Llama
- [ ] Pilih model: "Llama 3.1 8B"
- [ ] Input user story: "As a user, I want to login"
- [ ] Klik "Generate" button
- [ ] Verify:
  - [ ] Loading indicator muncul
  - [ ] Gherkin output muncul
  - [ ] Usage indicator update (remaining berkurang 1)
  - [ ] No error messages

### 4.5 Test Generate with Gemini Flash
- [ ] Pilih model: "Gemini 2.5 Flash"
- [ ] Input user story: "As a user, I want to register"
- [ ] Klik "Generate" button
- [ ] Verify:
  - [ ] Gherkin output muncul
  - [ ] Usage indicator update
  - [ ] No error messages

### 4.6 Test Limit Enforcement (if possible)
- [ ] Jika ada model dengan remaining = 0:
  - [ ] Pilih model tersebut
  - [ ] Try to generate
  - [ ] Verify: Error message muncul
  - [ ] Verify: Alternative models suggested
  - [ ] Verify: Can switch to alternative model

### 4.7 Test Usage Indicator
- [ ] Verify: Usage indicator visible
- [ ] Verify: Shows current usage (X/Y)
- [ ] Verify: Updates after each generate
- [ ] Verify: Visual indicator (progress bar/badge) works

---

## 📊 Step 5: Monitoring & Verification (2 menit)

### 5.1 Check Railway Logs
- [ ] Di Railway Dashboard, klik tab "Deployments"
- [ ] Klik deployment terbaru
- [ ] Klik "View Logs"
- [ ] Verify logs:
  - [ ] No error messages
  - [ ] See "LLM Provider Service initialized" (or similar)
  - [ ] See "Usage Limit Service initialized" (or similar)
  - [ ] See successful API calls

### 5.2 Check Database Usage Data
- [ ] Kembali ke Supabase Dashboard
- [ ] Di SQL Editor, run query:
```sql
SELECT 
  u.email,
  m.name as model,
  uc.request_count,
  mt.request_limit
FROM usage_counters uc
JOIN auth.users u ON u.id = uc.user_id
JOIN models m ON m.id = uc.model_id
JOIN model_tiers mt ON m.tier_id = mt.id
ORDER BY uc.last_request_at DESC
LIMIT 10;
```
- [ ] Verify:
  - [ ] Data exists for test user
  - [ ] request_count matches expected usage
  - [ ] last_request_at is recent

### 5.3 Check Usage History
- [ ] Di SQL Editor, run query:
```sql
SELECT 
  u.email,
  m.name as model,
  uh.success,
  uh.created_at
FROM usage_history uh
JOIN auth.users u ON u.id = uh.user_id
JOIN models m ON m.id = uh.model_id
ORDER BY uh.created_at DESC
LIMIT 10;
```
- [ ] Verify:
  - [ ] History records exist
  - [ ] success = true for successful requests
  - [ ] Timestamps are correct

---

## ✅ Post-Deployment Checklist

### Immediate Verification
- [ ] All API endpoints working
- [ ] Frontend ModelSelector visible and functional
- [ ] Usage tracking working correctly
- [ ] Limit enforcement working (429 errors)
- [ ] No errors in Railway logs
- [ ] No errors in browser console

### Documentation
- [ ] Update internal docs with deployment date
- [ ] Notify team about new feature
- [ ] Share user guide (if needed)

### Monitoring Setup
- [ ] Set up alerts for 429 errors (optional)
- [ ] Set up usage analytics dashboard (optional)
- [ ] Schedule review in 1 week

---

## 🎉 Success Criteria

Mark this section when ALL criteria are met:

- [ ] ✅ Migration successful (4 tables created)
- [ ] ✅ Seed data inserted (3 tiers, 3 models)
- [ ] ✅ GEMINI_API_KEY set in Railway
- [ ] ✅ Server redeployed successfully
- [ ] ✅ API /api/usage/limits returns 3 models
- [ ] ✅ API /api/gherkin/generate with model selection works
- [ ] ✅ Frontend ModelSelector visible
- [ ] ✅ Usage indicator updates correctly
- [ ] ✅ Limit enforcement works (429 error)
- [ ] ✅ Alternative models suggested
- [ ] ✅ No errors in logs
- [ ] ✅ Database tracking working

---

## 📝 Deployment Notes

### Deployment Date & Time
- Date: _______________
- Start Time: ___:___
- End Time: ___:___
- Total Duration: ___ minutes

### Issues Encountered
- Issue 1: _______________
  - Resolution: _______________
- Issue 2: _______________
  - Resolution: _______________

### Test Results
- API Tests: ☐ Pass ☐ Fail
- Frontend Tests: ☐ Pass ☐ Fail
- Database Tests: ☐ Pass ☐ Fail

### Notes
_______________________________________________
_______________________________________________
_______________________________________________

---

## 🚨 Rollback (If Needed)

If something goes wrong:

### Rollback Database
- [ ] Open Supabase SQL Editor
- [ ] Run rollback script:
```sql
DROP TABLE IF EXISTS usage_history CASCADE;
DROP TABLE IF EXISTS usage_counters CASCADE;
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS model_tiers CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
```

### Rollback Code
- [ ] Open Railway Dashboard
- [ ] Go to "Deployments" tab
- [ ] Find previous stable deployment
- [ ] Click "Redeploy"
- [ ] Wait for deployment to complete

### Verify Rollback
- [ ] Test API endpoints
- [ ] Check application works
- [ ] Verify no errors

---

## 📞 Support

If you need help:
1. Check [`DEPLOYMENT-LLM-USAGE-LIMIT.md`](aplikasi-server/DEPLOYMENT-LLM-USAGE-LIMIT.md) - Troubleshooting section
2. Review [`QUICK-COMMANDS.md`](QUICK-COMMANDS.md) - Debugging commands
3. Check Railway logs for errors
4. Check Supabase database for data issues

---

**Status**: ☐ Not Started ☐ In Progress ☐ Completed ☐ Rolled Back

**Final Result**: ☐ Success ☐ Partial Success ☐ Failed

**Deployed By**: _______________

**Verified By**: _______________
