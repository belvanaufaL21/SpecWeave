# Railway Deployment - Optimization Guide

## Issues Terdeteksi dari Deploy Logs

### ✅ Status: Server Berhasil Online
- Server berjalan di port 5003
- Environment: production
- API dan JIRA endpoints ready

### ⚠️ Warnings & Alerts

#### 1. Node.js Version Warning
```
⚠️ Node.js 18 and below are deprecated and will no longer be supported 
in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later.
```

**Solusi:**
- File `nixpacks.toml` sudah dibuat dengan Node.js 20
- File `package.json` sudah diupdate dengan engine requirement `>=20.0.0`

#### 2. Memory Alert - SUSTAINED_HIGH_MEMORY
```
🚨 [MONITORING ALERT] SUSTAINED_HIGH_MEMORY: 
{ duration: '5 minutes', highUsagePercentage: 100 }
```

**Penyebab:**
- Memory usage mencapai 100% (heap: 26.7MB/28.5MB = 93.6%)
- RSS: 77.8MB
- Kemungkinan memory limit Railway terlalu kecil

**Solusi yang Sudah Diterapkan:**

1. **Nixpacks Configuration** (`nixpacks.toml`):
   ```toml
   NODE_OPTIONS = "--max-old-space-size=512"
   ```
   Mengalokasikan 512MB untuk heap memory

2. **Optimasi di Environment Variables**:
   - `LOG_LEVEL=WARN` - Mengurangi logging
   - `SKIP_ERROR_LOGS_TABLE=true` - Skip database logging
   - `SKIP_PERFORMANCE_LOGS_TABLE=true` - Skip performance logging
   - `SKIP_MONITORING_ALERTS_TABLE=true` - Skip monitoring alerts

#### 3. NPM Warning
```
npm warn config production Use `--omit=dev` instead.
```

**Solusi:**
- Sudah ditangani di `nixpacks.toml` dengan `npm ci --production=false`

## Langkah Deploy Ulang

### 1. Set Root Directory di Railway Dashboard

**PENTING:** Railway perlu tahu bahwa backend ada di folder `aplikasi-server`

1. Buka Railway Dashboard → Your Service
2. Go to "Settings" tab
3. Scroll ke "Source" section
4. Klik "Add Root Directory"
5. Set ke: `aplikasi-server`
6. Save changes

### 2. Push Changes ke Repository
```bash
git add .
git commit -m "feat: optimize Railway deployment with Node.js 20 and memory settings"
git push
```

### 3. Railway akan Auto-Deploy
Railway akan mendeteksi perubahan dan melakukan deployment otomatis dengan konfigurasi baru.

### 4. Verifikasi di Railway Dashboard

**Cek Environment Variables:**
Pastikan variable berikut sudah diset di Railway:

```env
# Production Settings
NODE_ENV=production
PORT=5003

# Database
DATABASE_URL=<your-supabase-db-url>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# API Keys
GROQ_API_KEY=<your-groq-key>

# Logging - Ultra Clean
LOG_LEVEL=WARN
ENABLE_CONSOLE_LOGS=true
HEALTH_CHECK_VERBOSE=false
CLEAN_LOGS=true
SKIP_ERROR_LOGS_TABLE=true
SKIP_PERFORMANCE_LOGS_TABLE=true
SKIP_MONITORING_ALERTS_TABLE=true

# Performance
PERFORMANCE_ALERT_THRESHOLD_MS=10000

# JIRA
JIRA_ENCRYPTION_KEY=<your-encryption-key>

# Optional Redis
REDIS_URL=<if-you-have-redis>
```

### 4. Monitor Memory Usage

Setelah deploy, monitor di Railway Dashboard:
- Metrics → Memory Usage
- Jika masih high, upgrade plan atau optimize lebih lanjut

## Optimasi Tambahan (Jika Masih Ada Memory Issues)

### Option 1: Upgrade Railway Plan
- Starter plan: 512MB RAM
- Developer plan: 8GB RAM
- Upgrade jika aplikasi membutuhkan lebih banyak memory

### Option 2: Code Optimization
Jika tetap ingin menggunakan free/starter plan:

1. **Disable Redis** (gunakan memory cache):
   ```env
   # Hapus atau comment REDIS_URL
   # REDIS_URL=redis://localhost:6379
   ```

2. **Reduce Cache Size** di `aplikasi-server/config/cache.js`:
   ```javascript
   max: 50  // Reduce dari 100
   ```

3. **Optimize Health Checks**:
   ```env
   HEALTH_CHECK_INTERVAL=60000  # Check setiap 60 detik instead of 30
   ```

### Option 3: External Redis
Gunakan managed Redis (Upstash, Redis Cloud) untuk offload memory:
```env
REDIS_URL=redis://<external-redis-url>
```

## Health Check Status

Server memiliki health monitoring yang akan report:
- ✅ `healthy` - Semua check passed
- ⚠️ `degraded` - Ada warnings tapi masih operational
- ❌ `unhealthy` - Critical failures

Log menunjukkan transisi:
```
degraded → healthy (Critical: 0, Warnings: 0)
```

Ini normal saat startup dan memory stabilization.

## Monitoring Commands

### Check Server Health
```bash
curl https://your-app.railway.app/api/health
```

### Check Logs di Railway
```bash
railway logs
```

## Next Steps

1. ✅ Deploy dengan konfigurasi baru (Node.js 20 + memory optimization)
2. ⏳ Monitor memory usage selama 24 jam
3. 📊 Jika masih ada issues, pertimbangkan upgrade plan atau optimasi code
4. 🔍 Review logs untuk pattern memory leaks

## Support

Jika masih ada issues:
1. Check Railway Dashboard → Metrics
2. Review logs dengan `railway logs`
3. Adjust `NODE_OPTIONS` di `nixpacks.toml` sesuai kebutuhan
