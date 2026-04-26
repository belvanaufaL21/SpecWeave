# 🎨 LLM Usage Limit System - Visual Deployment Guide

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM Usage Limit System                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Economy    │  │   Standard   │  │   Premium    │          │
│  │  Llama 3.1   │  │  Gemini 2.5  │  │  Gemini 2.5  │          │
│  │     8B       │  │    Flash     │  │     Pro      │          │
│  │              │  │              │  │              │          │
│  │ 50 requests  │  │ 10 requests  │  │  1 request   │          │
│  │   per user   │  │   per user   │  │   per user   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  Provider:  Groq         Gemini          Gemini                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow

```
User
  │
  ├─> Frontend: ModelSelector
  │     │
  │     └─> Select Model (Llama / Gemini Flash / Gemini Pro)
  │
  ├─> API: POST /api/gherkin/generate
  │     │
  │     ├─> Middleware: usageLimitMiddleware
  │     │     │
  │     │     ├─> Check: user_id + model_id
  │     │     │
  │     │     ├─> Query: usage_counters
  │     │     │
  │     │     └─> Decision:
  │     │           ├─> ✅ remaining > 0 → Continue
  │     │           └─> ❌ remaining = 0 → Return 429 + alternatives
  │     │
  │     ├─> Controller: gherkinController
  │     │     │
  │     │     └─> Service: llmProviderService
  │     │           │
  │     │           ├─> Route to Groq (economy)
  │     │           └─> Route to Gemini (standard/premium)
  │     │
  │     ├─> LLM API Response
  │     │
  │     ├─> Service: usageLimitService.incrementUsage()
  │     │     │
  │     │     └─> UPDATE usage_counters SET request_count = request_count + 1
  │     │
  │     └─> Response: Gherkin + Usage Info
  │
  └─> Frontend: Display Result + Updated Usage
```

## 🗄️ Database Schema

```
┌─────────────────────┐
│   model_tiers       │
├─────────────────────┤
│ id (PK)             │
│ name (UNIQUE)       │◄─────┐
│ request_limit       │      │
│ description         │      │
│ created_at          │      │
│ updated_at          │      │
└─────────────────────┘      │
                              │
                              │ FK: tier_id
┌─────────────────────┐      │
│   models            │      │
├─────────────────────┤      │
│ id (PK)             │◄─────┼─────┐
│ name (UNIQUE)       │      │     │
│ display_name        │      │     │
│ provider            │      │     │
│ tier_id (FK)        │──────┘     │
│ is_active           │            │
│ created_at          │            │
│ updated_at          │            │
└─────────────────────┘            │
                                    │ FK: model_id
┌─────────────────────┐            │
│  usage_counters     │            │
├─────────────────────┤            │
│ id (PK)             │            │
│ user_id (FK)        │            │
│ model_id (FK)       │────────────┘
│ request_count       │
│ last_request_at     │
│ created_at          │
│ updated_at          │
│ UNIQUE(user_id,     │
│        model_id)    │
└─────────────────────┘
         │
         │ FK: user_id, model_id
         │
┌─────────────────────┐
│  usage_history      │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ model_id (FK)       │
│ request_id          │
│ success             │
│ error_message       │
│ created_at          │
└─────────────────────┘
```

## 📈 Deployment Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                     Deployment Timeline                          │
└─────────────────────────────────────────────────────────────────┘

T+0min  ┌──────────────────────────────────────┐
        │ 1. Run Migration in Supabase         │
        │    - Create 4 tables                 │
        │    - Insert seed data (3+3 rows)     │
        │    - Create indexes                  │
        │    - Create triggers                 │
        └──────────────────────────────────────┘
T+2min  ✅ Migration Complete

T+2min  ┌──────────────────────────────────────┐
        │ 2. Update Railway Environment        │
        │    - Add GEMINI_API_KEY              │
        └──────────────────────────────────────┘
T+3min  ✅ Environment Updated
        🔄 Auto-redeploy triggered

T+3min  ┌──────────────────────────────────────┐
        │ 3. Railway Redeploy                  │
        │    - Build new image                 │
        │    - Deploy to production            │
        │    - Health checks                   │
        └──────────────────────────────────────┘
T+5min  ✅ Deployment Complete

T+5min  ┌──────────────────────────────────────┐
        │ 4. Verification                      │
        │    - Test /api/usage/limits          │
        │    - Test /api/gherkin/generate      │
        │    - Check frontend ModelSelector    │
        └──────────────────────────────────────┘
T+6min  ✅ System Live!
```

## 🎯 Deployment Steps (Visual)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Supabase Migration                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Open: https://supabase.com/dashboard/...                    │
│  2. Click: SQL Editor → New Query                               │
│  3. Copy: migrations/add-llm-usage-limit-system.sql             │
│  4. Paste & Run                                                  │
│  5. Wait for: ✅ Success                                         │
│                                                                   │
│  Expected Output:                                                │
│  ✅ CREATE TABLE model_tiers                                     │
│  ✅ INSERT 3 rows into model_tiers                               │
│  ✅ CREATE TABLE models                                          │
│  ✅ INSERT 3 rows into models                                    │
│  ✅ CREATE TABLE usage_counters                                  │
│  ✅ CREATE TABLE usage_history                                   │
│  ✅ CREATE 5+ indexes                                            │
│  ✅ CREATE 3+ triggers                                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Railway Environment                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Open: https://railway.app/                                  │
│  2. Select: specweave-server project                            │
│  3. Click: Variables tab                                         │
│  4. Add Variable:                                                │
│     Name:  GEMINI_API_KEY                                        │
│     Value: AIzaSyCRqEoqiZL3QvPvXfrZd3weB_LnMwLu83s              │
│  5. Click: Add                                                   │
│  6. Wait for: 🔄 Auto-redeploy                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Verification                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Test 1: Check Models Available                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ curl /api/usage/limits                                   │   │
│  │                                                           │   │
│  │ Expected Response:                                        │   │
│  │ {                                                         │   │
│  │   "models": [                                             │   │
│  │     { "name": "llama-3.1-8b-instant", limit: 50 },       │   │
│  │     { "name": "gemini-2.5-flash", limit: 10 },           │   │
│  │     { "name": "gemini-2.5-pro", limit: 1 }               │   │
│  │   ]                                                       │   │
│  │ }                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Test 2: Generate with Model                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ curl POST /api/gherkin/generate                          │   │
│  │ { "userStory": "...", "model": "llama-3.1-8b-instant" }  │   │
│  │                                                           │   │
│  │ Expected Response:                                        │   │
│  │ {                                                         │   │
│  │   "gherkin": "...",                                       │   │
│  │   "usage": {                                              │   │
│  │     "model": "llama-3.1-8b-instant",                     │   │
│  │     "remaining": 49,                                      │   │
│  │     "limit": 50                                           │   │
│  │   }                                                       │   │
│  │ }                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Test 3: Frontend Check                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Open: https://specweave-client...                     │   │
│  │ 2. Login                                                  │   │
│  │ 3. Go to: Chat/Generate page                             │   │
│  │ 4. Check: ModelSelector dropdown visible                 │   │
│  │ 5. Check: Shows 3 models with limits                     │   │
│  │ 6. Test: Generate with each model                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 User Experience Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Experience                             │
└─────────────────────────────────────────────────────────────────┘

Before (Old System):
┌──────────────────────────────────────┐
│  User Story Input                    │
│  ┌────────────────────────────────┐  │
│  │ As a user, I want to login     │  │
│  └────────────────────────────────┘  │
│                                       │
│  [Generate] ← Only one option        │
│                                       │
│  ↓ Always uses Groq Llama            │
└──────────────────────────────────────┘

After (New System):
┌──────────────────────────────────────┐
│  User Story Input                    │
│  ┌────────────────────────────────┐  │
│  │ As a user, I want to login     │  │
│  └────────────────────────────────┘  │
│                                       │
│  Model Selection:                    │
│  ┌────────────────────────────────┐  │
│  │ ▼ Llama 3.1 8B (50/50) ✅      │  │
│  │   Gemini 2.5 Flash (10/10) ✅  │  │
│  │   Gemini 2.5 Pro (1/1) ✅      │  │
│  └────────────────────────────────┘  │
│                                       │
│  [Generate]                          │
│                                       │
│  ↓ Routes to selected provider       │
│                                       │
│  Result + Usage Info:                │
│  ┌────────────────────────────────┐  │
│  │ Gherkin output...              │  │
│  │                                 │  │
│  │ Used: Llama 3.1 8B             │  │
│  │ Remaining: 49/50 ⚡            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

When Limit Reached:
┌──────────────────────────────────────┐
│  Model Selection:                    │
│  ┌────────────────────────────────┐  │
│  │ ▼ Gemini 2.5 Pro (0/1) ❌      │  │
│  └────────────────────────────────┘  │
│                                       │
│  [Generate]                          │
│                                       │
│  ↓ Limit check fails                 │
│                                       │
│  Error Message:                      │
│  ┌────────────────────────────────┐  │
│  │ ⚠️ Limit reached for           │  │
│  │    Gemini 2.5 Pro (1/1)        │  │
│  │                                 │  │
│  │ Try these alternatives:         │  │
│  │ • Llama 3.1 8B (49/50)         │  │
│  │ • Gemini 2.5 Flash (10/10)     │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## 📊 Success Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                      Success Indicators                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ Database                                                      │
│     ├─ 4 tables created                                          │
│     ├─ 3 tiers seeded                                            │
│     ├─ 3 models seeded                                           │
│     └─ Indexes & triggers active                                 │
│                                                                   │
│  ✅ Backend                                                       │
│     ├─ GEMINI_API_KEY set                                        │
│     ├─ Server deployed                                           │
│     ├─ /api/usage/limits returns 3 models                        │
│     └─ /api/gherkin/generate with model selection works          │
│                                                                   │
│  ✅ Frontend                                                      │
│     ├─ ModelSelector visible                                     │
│     ├─ Shows 3 models with limits                                │
│     ├─ Usage indicator updates                                   │
│     └─ Error handling for 429                                    │
│                                                                   │
│  ✅ Functionality                                                 │
│     ├─ Limit enforcement (429 at limit)                          │
│     ├─ Counter increment after request                           │
│     ├─ Alternative suggestions                                   │
│     └─ Multi-provider routing                                    │
│                                                                   │
│  ✅ Monitoring                                                    │
│     ├─ No errors in Railway logs                                 │
│     ├─ Usage history recording                                   │
│     └─ Performance acceptable                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚨 Troubleshooting Decision Tree

```
Problem?
  │
  ├─ Migration failed?
  │   │
  │   ├─ "relation already exists"
  │   │   └─> ✅ Tables already exist, skip migration
  │   │
  │   └─ Other error
  │       └─> Check Supabase logs, fix SQL, retry
  │
  ├─ API returns 500?
  │   │
  │   ├─ Check Railway logs
  │   │   │
  │   │   ├─ "GEMINI_API_KEY not found"
  │   │   │   └─> Add GEMINI_API_KEY to Railway
  │   │   │
  │   │   └─ "table does not exist"
  │   │       └─> Run migration in Supabase
  │   │
  │   └─> Review error details, fix, redeploy
  │
  ├─ Frontend no ModelSelector?
  │   │
  │   ├─ Clear browser cache
  │   ├─ Check browser console for errors
  │   └─> Verify API /api/usage/limits returns data
  │
  └─ Limit not enforcing?
      │
      ├─ Check usage_counters table
      ├─ Verify middleware is applied
      └─> Check Railway logs for errors
```

---

## 🎉 You're Ready!

Follow the visual guide above for a smooth deployment experience.

**Next**: Open [`QUICK-DEPLOYMENT-CHECKLIST.md`](aplikasi-server/QUICK-DEPLOYMENT-CHECKLIST.md) and start deploying!
