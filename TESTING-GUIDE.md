# 🧪 Testing Guide - LLM Usage Limit System

## ✅ Status: Code Pushed, Ready for Testing

Kode sudah di-push ke repository. Railway akan otomatis deploy dalam ~2-3 menit.

---

## 📋 Pre-Testing Checklist

- [x] Step 1: Migration dijalankan di Supabase ✅
- [x] Step 2: GEMINI_API_KEY di-set di Railway ✅
- [x] Step 3: Kode di-push ke repository ✅
- [ ] Step 4: Tunggu Railway deployment selesai
- [ ] Step 5: Test API endpoints
- [ ] Step 6: Test frontend

---

## ⏱️ Wait for Railway Deployment

### Check Deployment Status

1. **Buka Railway Dashboard**
   - URL: https://railway.app/
   - Pilih project "specweave-server"

2. **Go to Deployments Tab**
   - Klik tab "Deployments"
   - Lihat deployment terbaru (commit: "feat: Add LLM Usage Limit System...")

3. **Monitor Status**
   - Status: Building → Deploying → Success
   - Estimated time: 2-3 menit
   - Watch logs untuk memastikan tidak ada error

4. **Check Logs**
   - Klik deployment terbaru
   - Klik "View Logs"
   - Look for:
     - ✅ "Server running on port..."
     - ✅ "LLM Provider Service initialized" (or similar)
     - ✅ "Usage Limit Service initialized" (or similar)
     - ❌ No error messages

---

## 🧪 API Testing

### Get Access Token

Buka aplikasi client dan get JWT token:

**Option 1: Browser Console**
```javascript
// Di https://specweave-client-production.up.railway.app
// Buka console (F12)
localStorage.getItem('supabase.auth.token')
```

**Option 2: Supabase Client**
```javascript
const { data } = await supabase.auth.getSession()
console.log(data.session.access_token)
```

Save token: `YOUR_TOKEN = _______________`

---

### Test 1: Check Models Available

```bash
curl -X GET https://specweave-server-production.up.railway.app/api/usage/limits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
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

**Verify:**
- [ ] Status code: 200
- [ ] Response has "models" array
- [ ] Array has 3 items
- [ ] Each model has: name, displayName, provider, tier, limit, used, remaining
- [ ] Limits are: 50, 10, 1

---

### Test 2: Generate with Llama (Economy)

```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user, I want to login so that I can access my account",
    "model": "llama-3.1-8b-instant"
  }'
```

**Expected Response:**
```json
{
  "gherkin": "Feature: User Login\n  Scenario: ...",
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

**Verify:**
- [ ] Status code: 200
- [ ] Response has "gherkin" field with Gherkin output
- [ ] Response has "usage" object
- [ ] usage.model = "llama-3.1-8b-instant"
- [ ] usage.remaining = 49 (decreased by 1)
- [ ] usage.limit = 50

---

### Test 3: Generate with Gemini Flash (Standard)

```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user, I want to register a new account",
    "model": "gemini-2.5-flash"
  }'
```

**Expected Response:**
```json
{
  "gherkin": "Feature: User Registration\n  Scenario: ...",
  "usage": {
    "model": "gemini-2.5-flash",
    "displayName": "Gemini 2.5 Flash",
    "provider": "gemini",
    "tier": "standard",
    "remaining": 9,
    "limit": 10
  }
}
```

**Verify:**
- [ ] Status code: 200
- [ ] Gherkin output generated
- [ ] usage.model = "gemini-2.5-flash"
- [ ] usage.remaining = 9
- [ ] usage.limit = 10

---

### Test 4: Generate with Gemini Pro (Premium)

```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As an admin, I want to manage users",
    "model": "gemini-2.5-pro"
  }'
```

**Expected Response:**
```json
{
  "gherkin": "Feature: User Management\n  Scenario: ...",
  "usage": {
    "model": "gemini-2.5-pro",
    "displayName": "Gemini 2.5 Pro",
    "provider": "gemini",
    "tier": "premium",
    "remaining": 0,
    "limit": 1
  }
}
```

**Verify:**
- [ ] Status code: 200
- [ ] Gherkin output generated
- [ ] usage.model = "gemini-2.5-pro"
- [ ] usage.remaining = 0 (limit reached)
- [ ] usage.limit = 1

---

### Test 5: Limit Enforcement (429 Error)

Try to generate again with Gemini Pro (already at limit):

```bash
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user, I want to do something",
    "model": "gemini-2.5-pro"
  }'
```

**Expected Response:**
```json
{
  "error": "Request limit reached for Gemini 2.5 Pro (premium tier). You have used 1 out of 1 requests.",
  "alternatives": [
    {
      "name": "llama-3.1-8b-instant",
      "displayName": "Llama 3.1 8B",
      "tier": "economy",
      "remaining": 49
    },
    {
      "name": "gemini-2.5-flash",
      "displayName": "Gemini 2.5 Flash",
      "tier": "standard",
      "remaining": 9
    }
  ]
}
```

**Verify:**
- [ ] Status code: 429
- [ ] Response has "error" field with clear message
- [ ] Error mentions model name, tier, and limit
- [ ] Response has "alternatives" array
- [ ] Alternatives only include models with remaining > 0
- [ ] Alternatives do NOT include gemini-2.5-pro (at limit)

---

## 🎨 Frontend Testing

### Test 1: ModelSelector Visible

1. **Open Client App**
   - URL: https://specweave-client-production.up.railway.app
   - Login dengan akun test

2. **Navigate to Chat/Generate Page**
   - Go to page yang ada generate functionality

3. **Verify ModelSelector**
   - [ ] Dropdown untuk model selection visible
   - [ ] Dropdown menampilkan 3 models
   - [ ] Each model shows:
     - Display name (Llama 3.1 8B, Gemini 2.5 Flash, Gemini 2.5 Pro)
     - Tier badge (Economy, Standard, Premium)
     - Usage info (X/Y requests)

---

### Test 2: Generate with Different Models

**Test with Llama:**
- [ ] Select "Llama 3.1 8B" from dropdown
- [ ] Input user story: "As a user, I want to login"
- [ ] Click "Generate"
- [ ] Verify: Gherkin output appears
- [ ] Verify: Usage indicator updates (48/50 or similar)
- [ ] Verify: No error messages

**Test with Gemini Flash:**
- [ ] Select "Gemini 2.5 Flash" from dropdown
- [ ] Input user story: "As a user, I want to register"
- [ ] Click "Generate"
- [ ] Verify: Gherkin output appears
- [ ] Verify: Usage indicator updates (8/10 or similar)
- [ ] Verify: No error messages

---

### Test 3: Usage Indicator

- [ ] Usage indicator visible
- [ ] Shows format: "X/Y requests" or similar
- [ ] Updates after each generate
- [ ] Visual indicator (progress bar/badge) works
- [ ] Different colors for different usage levels (optional)

---

### Test 4: Limit Enforcement UI

If you have a model at limit (e.g., Gemini Pro at 0/1):

- [ ] Select model at limit
- [ ] Try to generate
- [ ] Verify: Error message appears
- [ ] Verify: Error message is clear and user-friendly
- [ ] Verify: Alternative models suggested
- [ ] Verify: Can click/select alternative model
- [ ] Verify: Generate works with alternative model

---

## 📊 Database Verification

### Check Usage Counters

Di Supabase SQL Editor:

```sql
SELECT 
  u.email,
  m.name as model,
  uc.request_count,
  mt.request_limit,
  uc.last_request_at
FROM usage_counters uc
JOIN auth.users u ON u.id = uc.user_id
JOIN models m ON m.id = uc.model_id
JOIN model_tiers mt ON m.tier_id = mt.id
WHERE u.email = 'YOUR_TEST_EMAIL'
ORDER BY uc.last_request_at DESC;
```

**Verify:**
- [ ] Data exists for test user
- [ ] request_count matches expected usage
- [ ] last_request_at is recent

---

### Check Usage History

```sql
SELECT 
  u.email,
  m.name as model,
  uh.success,
  uh.created_at
FROM usage_history uh
JOIN auth.users u ON u.id = uh.user_id
JOIN models m ON m.id = uh.model_id
WHERE u.email = 'YOUR_TEST_EMAIL'
ORDER BY uh.created_at DESC
LIMIT 10;
```

**Verify:**
- [ ] History records exist
- [ ] success = true for successful requests
- [ ] Timestamps are correct
- [ ] All test requests recorded

---

## ✅ Success Criteria

Mark when ALL criteria met:

### API
- [ ] ✅ /api/usage/limits returns 3 models
- [ ] ✅ /api/gherkin/generate with model selection works
- [ ] ✅ Usage info included in response
- [ ] ✅ Limit enforcement works (429 error)
- [ ] ✅ Alternative models suggested

### Frontend
- [ ] ✅ ModelSelector visible and functional
- [ ] ✅ Can select different models
- [ ] ✅ Generate works with all models
- [ ] ✅ Usage indicator updates correctly
- [ ] ✅ Error handling for 429 works

### Database
- [ ] ✅ usage_counters tracking correctly
- [ ] ✅ usage_history recording requests
- [ ] ✅ Counters increment after each request
- [ ] ✅ No duplicate or missing records

### System
- [ ] ✅ No errors in Railway logs
- [ ] ✅ No errors in browser console
- [ ] ✅ Multi-provider routing works (Groq + Gemini)
- [ ] ✅ Performance acceptable

---

## 🎉 Testing Complete!

Jika semua test passed, sistem berhasil di-deploy dan siap digunakan oleh semua pengguna!

**Next Steps:**
1. Monitor usage patterns
2. Check for any errors in production
3. Collect user feedback
4. Adjust limits if needed

---

## 🚨 If Tests Fail

### API Returns 500
- Check Railway logs for error details
- Verify GEMINI_API_KEY is set
- Verify migration was run successfully

### Frontend Not Working
- Clear browser cache
- Check browser console for errors
- Verify API endpoints return correct data

### Database Issues
- Check Supabase logs
- Verify migration was run
- Check table structure and data

See [`DEPLOYMENT-LLM-USAGE-LIMIT.md`](aplikasi-server/DEPLOYMENT-LLM-USAGE-LIMIT.md) for detailed troubleshooting.
