# 🔧 Railway Memory Fix - Action Items

## ✅ Yang Sudah Dilakukan

1. ✅ **Update package.json** - Memory limit ditambahkan
   ```json
   "start": "node --no-warnings --max-old-space-size=512 index.js"
   ```

2. ✅ **Fix Security Vulnerabilities** - 6 vulnerabilities fixed
   ```bash
   npm audit fix → 0 vulnerabilities
   ```

## ⏳ Yang Perlu Dilakukan di Railway Dashboard

### Step 1: Update Environment Variables

Buka Railway Dashboard → Service `aplikasi-server` → Variables tab

**Tambahkan/Update variables berikut:**

```bash
# Memory Optimization
NODE_OPTIONS=--max-old-space-size=512

# Production Mode
NODE_ENV=production

# Minimal Logging (hemat memory)
LOG_LEVEL=ERROR
HEALTH_CHECK_VERBOSE=false
CLEAN_LOGS=true

# Disable Heavy Features
SKIP_ERROR_LOGS_TABLE=true
SKIP_PERFORMANCE_LOGS_TABLE=true
SKIP_MONITORING_ALERTS_TABLE=true

# Performance Threshold (kurangi alert noise)
PERFORMANCE_ALERT_THRESHOLD_MS=10000
```

### Step 2: Commit & Push Changes

```bash
git add aplikasi-server/package.json aplikasi-server/package-lock.json
git commit -m "fix: optimize memory usage and fix security vulnerabilities"
git push origin main
```

Railway akan auto-deploy setelah push.

### Step 3: Monitor Deployment

Setelah deploy selesai, cek logs:

```bash
railway logs --service aplikasi-server --tail
```

**Expected Output:**
```
✅ SpecWeave Server running on port 5003
🌐 Environment: production
✅ [DEPLOYMENT] Initial health check passed
```

**NO MORE:**
```
❌ 🚨 [MONITORING ALERT] HIGH_MEMORY_USAGE
❌ 🚨 [MONITORING ALERT] SUSTAINED_HIGH_MEMORY
❌ Health status changed: healthy → degraded
```

## 📊 Perbandingan Before/After

### Before (Current Logs)
```
Memory Usage: 90-95% (degraded)
Heap Used: 25-27MB (>95% threshold)
Status: healthy ↔ degraded (flapping)
Alerts: HIGH_MEMORY_USAGE setiap 30 detik
```

### After (Expected)
```
Memory Usage: 60-75% (healthy)
Heap Used: <20MB (<80% threshold)
Status: healthy (stable)
Alerts: None
```

## 🎯 Success Criteria

Deploy dianggap berhasil jika:

1. ✅ Build selesai tanpa error
2. ✅ Server start dengan "Initial health check passed"
3. ✅ Tidak ada `HIGH_MEMORY_USAGE` alerts dalam 10 menit pertama
4. ✅ Status tetap `healthy` (tidak flapping ke `degraded`)
5. ✅ Response time API <500ms

## 🔍 Troubleshooting

### Jika masih ada memory alerts:

**Option 1: Increase Memory Limit (jika masih di free tier)**
```bash
NODE_OPTIONS=--max-old-space-size=400
```

**Option 2: Disable More Features**
```bash
REDIS_URL=  # Disable Redis, use memory cache
ENABLE_CONSOLE_LOGS=false
```

**Option 3: Upgrade Railway Plan**
- Pro Plan: 8GB RAM
- Lebih stabil untuk production

### Jika app crash:

Check logs untuk error:
```bash
railway logs --service aplikasi-server | grep -i error
```

Common issues:
- Missing environment variables
- Database connection timeout
- Port binding issues

## 📝 Deployment Checklist

- [x] Update package.json dengan memory limit
- [x] Fix security vulnerabilities (npm audit fix)
- [ ] Update Railway environment variables
- [ ] Commit & push changes
- [ ] Monitor deployment logs
- [ ] Verify health status
- [ ] Test API endpoints
- [ ] Check memory usage after 10 minutes

## 🚀 Quick Deploy Commands

```bash
# 1. Commit changes
git add .
git commit -m "fix: optimize memory and security"

# 2. Push to trigger deploy
git push origin main

# 3. Watch logs
railway logs --service aplikasi-server --tail

# 4. Check health
curl https://your-railway-url.railway.app/api/health
```

## 📞 Support

Jika masih ada issues setelah deploy:
1. Share Railway logs
2. Check Railway metrics dashboard
3. Verify all environment variables set correctly

---

**Status:** Ready to deploy
**Next Action:** Update Railway environment variables → Push changes
