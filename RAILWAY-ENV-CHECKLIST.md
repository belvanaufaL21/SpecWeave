# Railway Environment Variables Checklist

## ✅ Required Variables (Must Set)

```env
# Server Configuration
NODE_ENV=production
PORT=5003

# Supabase Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.nthylrvtkaqqixznrtaj.supabase.co:5432/postgres
SUPABASE_URL=https://nthylrvtkaqqixznrtaj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI API
GROQ_API_KEY=gsk_...

# Security
JIRA_ENCRYPTION_KEY=specweave-jira-encryption-key-change-in-production-2024
```

## 🎯 Optimization Variables (Recommended)

```env
# Logging - Ultra Clean Mode
LOG_LEVEL=WARN
ENABLE_CONSOLE_LOGS=true
HEALTH_CHECK_VERBOSE=false
CLEAN_LOGS=true
SKIP_ERROR_LOGS_TABLE=true
SKIP_PERFORMANCE_LOGS_TABLE=true
SKIP_MONITORING_ALERTS_TABLE=true

# Performance Tuning
PERFORMANCE_ALERT_THRESHOLD_MS=10000
```

## 🔧 Optional Variables

```env
# Redis (if using external Redis)
REDIS_URL=redis://default:password@host:port
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Python/METEOR (if using evaluation features)
PYTHON_PATH=python
METEOR_SCRIPT_PATH=./scripts/meteor_evaluator.py
METEOR_QUALITY_THRESHOLD=0.7
```

## 📋 Copy-Paste Template for Railway

Ganti nilai yang di dalam `<...>` dengan nilai aktual Anda:

```env
NODE_ENV=production
PORT=5003
DATABASE_URL=<your-supabase-database-url>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
GROQ_API_KEY=<your-groq-api-key>
JIRA_ENCRYPTION_KEY=<generate-random-string-32-chars>
LOG_LEVEL=WARN
ENABLE_CONSOLE_LOGS=true
HEALTH_CHECK_VERBOSE=false
CLEAN_LOGS=true
SKIP_ERROR_LOGS_TABLE=true
SKIP_PERFORMANCE_LOGS_TABLE=true
SKIP_MONITORING_ALERTS_TABLE=true
PERFORMANCE_ALERT_THRESHOLD_MS=10000
```

## 🚀 How to Set in Railway

### Via Railway Dashboard:
1. Go to your project
2. Click on your service
3. Go to "Variables" tab
4. Click "Raw Editor"
5. Paste the template above (with your actual values)
6. Click "Deploy"

### Via Railway CLI:
```bash
railway variables set NODE_ENV=production
railway variables set PORT=5003
# ... set other variables
```

## ⚠️ Important Notes

1. **Never commit `.env` files** with production secrets to git
2. **JIRA_ENCRYPTION_KEY** should be a random 32+ character string
3. **GROQ_API_KEY** get from https://console.groq.com
4. **Supabase credentials** get from your Supabase project settings
5. Railway will auto-deploy when you change variables

## 🔍 Verify Variables

After setting, verify in Railway logs:
```
✅ SpecWeave Server running on port 5003
🌐 Environment: production
```

If you see errors about missing variables, check the logs for which ones are missing.
