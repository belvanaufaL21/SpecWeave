# Quick Commands Reference - LLM Usage Limit System

## 🚀 Deployment Commands

### Check System Readiness
```bash
cd aplikasi-server
npm run check:llm-system
```

### Run Tests
```bash
cd aplikasi-server
npm test
```

### Run Specific Test Suites
```bash
# LLM Provider Service tests
npm test -- llmProviderService

# Usage Limit Service tests
npm test -- usageLimitService

# Middleware tests
npm test -- usageLimitMiddleware

# Controller tests
npm test -- usageController
```

## 📊 Database Verification (Supabase SQL Editor)

### Check Tables Exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('model_tiers', 'models', 'usage_counters', 'usage_history');
```

### Check Seed Data
```sql
-- Check tiers (should return 3)
SELECT name, request_limit FROM model_tiers ORDER BY request_limit DESC;

-- Check models (should return 3)
SELECT m.name, m.display_name, m.provider, mt.name as tier, mt.request_limit
FROM models m
JOIN model_tiers mt ON m.tier_id = mt.id;
```

### Check User Usage (replace USER_ID)
```sql
SELECT 
  m.name,
  m.display_name,
  mt.name as tier,
  mt.request_limit as limit,
  COALESCE(uc.request_count, 0) as used,
  mt.request_limit - COALESCE(uc.request_count, 0) as remaining
FROM models m
JOIN model_tiers mt ON m.tier_id = mt.id
LEFT JOIN usage_counters uc ON uc.model_id = m.id AND uc.user_id = 'USER_ID'
WHERE m.is_active = true;
```

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
ORDER BY uh.created_at DESC
LIMIT 20;
```

## 🧪 API Testing Commands

### Test Usage Limits Endpoint
```bash
# Replace YOUR_TOKEN with actual JWT token
curl -X GET https://specweave-server-production.up.railway.app/api/usage/limits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Generate with Model Selection
```bash
# Test with Llama (economy)
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user, I want to login",
    "model": "llama-3.1-8b-instant"
  }'

# Test with Gemini Flash (standard)
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user, I want to login",
    "model": "gemini-2.5-flash"
  }'

# Test with Gemini Pro (premium)
curl -X POST https://specweave-server-production.up.railway.app/api/gherkin/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userStory": "As a user, I want to login",
    "model": "gemini-2.5-pro"
  }'
```

### Test Usage History Endpoint
```bash
curl -X GET "https://specweave-server-production.up.railway.app/api/usage/history?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Maintenance Commands

### Add New Model
```sql
-- Add new model to database
INSERT INTO models (name, display_name, provider, tier_id)
VALUES (
  'new-model-name',
  'New Model Display Name',
  'groq', -- or 'gemini'
  (SELECT id FROM model_tiers WHERE name = 'economy') -- or 'standard', 'premium'
);
```

### Update Tier Limits
```sql
-- Update request limits for a tier
UPDATE model_tiers 
SET request_limit = 100 
WHERE name = 'economy';
```

### Reset User Usage (for testing)
```sql
-- Reset usage for specific user
DELETE FROM usage_counters WHERE user_id = 'USER_ID';
DELETE FROM usage_history WHERE user_id = 'USER_ID';
```

### Disable/Enable Model
```sql
-- Disable model
UPDATE models SET is_active = false WHERE name = 'model-name';

-- Enable model
UPDATE models SET is_active = true WHERE name = 'model-name';
```

## 📈 Monitoring Queries

### Top Users by Usage
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
ORDER BY uc.request_count DESC
LIMIT 20;
```

### Usage by Model
```sql
SELECT 
  m.name,
  m.display_name,
  COUNT(DISTINCT uc.user_id) as unique_users,
  SUM(uc.request_count) as total_requests,
  AVG(uc.request_count) as avg_per_user
FROM models m
LEFT JOIN usage_counters uc ON uc.model_id = m.id
GROUP BY m.id, m.name, m.display_name
ORDER BY total_requests DESC;
```

### Recent Errors
```sql
SELECT 
  u.email,
  m.name as model,
  uh.error_message,
  uh.created_at
FROM usage_history uh
JOIN auth.users u ON u.id = uh.user_id
JOIN models m ON m.id = uh.model_id
WHERE uh.success = false
ORDER BY uh.created_at DESC
LIMIT 20;
```

### Users at Limit
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
WHERE uc.request_count >= mt.request_limit
ORDER BY uc.last_request_at DESC;
```

## 🔄 Rollback Commands

### Rollback Database Migration
```sql
DROP TABLE IF EXISTS usage_history CASCADE;
DROP TABLE IF EXISTS usage_counters CASCADE;
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS model_tiers CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
```

### Rollback Code (Railway)
```bash
# In Railway Dashboard:
# 1. Go to "Deployments" tab
# 2. Find previous stable deployment
# 3. Click "Redeploy"
```

## 🐛 Debugging Commands

### Check Railway Logs
```bash
# In Railway Dashboard:
# 1. Click "Deployments" tab
# 2. Click latest deployment
# 3. Click "View Logs"
# 
# Look for:
# - "LLM Provider Service initialized"
# - "Usage Limit Service initialized"
# - Any error messages
```

### Check Environment Variables
```bash
# In Railway Dashboard:
# 1. Click "Variables" tab
# 2. Verify these exist:
#    - GROQ_API_KEY
#    - GEMINI_API_KEY
#    - SUPABASE_URL
#    - SUPABASE_ANON_KEY
```

### Test Locally
```bash
cd aplikasi-server

# Start server
npm run dev

# In another terminal, test endpoints
curl http://localhost:5003/api/usage/limits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Quick Reference URLs

### Supabase
- Dashboard: https://supabase.com/dashboard/project/nthylrvtkaqqixznrtaj
- SQL Editor: https://supabase.com/dashboard/project/nthylrvtkaqqixznrtaj/sql

### Railway
- Dashboard: https://railway.app/
- Project: specweave-server

### API Endpoints
- Production: https://specweave-server-production.up.railway.app
- Client: https://specweave-client-production.up.railway.app

### API Keys
- Groq: https://console.groq.com/keys
- Gemini: https://aistudio.google.com/app/apikey

## 💡 Tips

### Get JWT Token for Testing
```javascript
// In browser console on client app
localStorage.getItem('supabase.auth.token')
// or
const { data } = await supabase.auth.getSession()
console.log(data.session.access_token)
```

### Quick Health Check
```bash
# Check if server is running
curl https://specweave-server-production.up.railway.app/health

# Check if database is accessible
curl https://specweave-server-production.up.railway.app/api/usage/limits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Performance Testing
```bash
# Test response time
time curl https://specweave-server-production.up.railway.app/api/usage/limits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Quick Links**:
- [Deployment Checklist](aplikasi-server/QUICK-DEPLOYMENT-CHECKLIST.md)
- [Full Deployment Guide](aplikasi-server/DEPLOYMENT-LLM-USAGE-LIMIT.md)
- [System Summary](LLM-USAGE-LIMIT-DEPLOYMENT-SUMMARY.md)
