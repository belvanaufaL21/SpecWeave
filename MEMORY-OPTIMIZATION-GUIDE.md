# 🧠 Memory Optimization Guide - Railway Deployment

## 📊 Analisis Masalah

Dari deploy logs terdeteksi:
- ⚠️ `HIGH_MEMORY_USAGE`: Heap usage >95% threshold
- ⚠️ `SUSTAINED_HIGH_MEMORY`: Memory tinggi selama 5+ menit
- 🔄 Status berubah: `healthy` ↔ `degraded`

## ✅ Solusi yang Diterapkan

### 1. Node.js Memory Limit
```json
"start": "node --no-warnings --max-old-space-size=512 index.js"
```

**Penjelasan:**
- `--max-old-space-size=512`: Batasi heap memory ke 512MB
- Railway free tier: 512MB RAM total
- Sisakan ~100-200MB untuk OS dan overhead

### 2. Environment Variables untuk Production

Tambahkan di Railway Environment Variables:

```bash
# Memory & Performance
NODE_OPTIONS=--max-old-space-size=512
NODE_ENV=production

# Logging - Minimal untuk hemat memory
LOG_LEVEL=ERROR
HEALTH_CHECK_VERBOSE=false
CLEAN_LOGS=true

# Disable heavy features
SKIP_ERROR_LOGS_TABLE=true
SKIP_PERFORMANCE_LOGS_TABLE=true
SKIP_MONITORING_ALERTS_TABLE=true
```

### 3. Compression & Caching

Pastikan sudah aktif di `index.js`:
```javascript
import compression from 'compression';
app.use(compression()); // Gzip compression
```

### 4. Security Vulnerabilities

Build logs menunjukkan 6 vulnerabilities:
```bash
npm audit fix
```

## 🚀 Deployment Steps

### Step 1: Update Package.json
✅ Sudah dilakukan - memory limit ditambahkan

### Step 2: Update Railway Environment Variables

Di Railway Dashboard → Service → Variables:

```bash
NODE_OPTIONS=--max-old-space-size=512
NODE_ENV=production
LOG_LEVEL=ERROR
HEALTH_CHECK_VERBOSE=false
```

### Step 3: Fix Security Issues (Optional tapi Recommended)

```bash
cd aplikasi-server
npm audit fix
git add package-lock.json
git commit -m "fix: security vulnerabilities"
git push
```

### Step 4: Redeploy

Railway akan auto-redeploy setelah push, atau manual trigger:
```bash
railway up
```

## 📈 Monitoring Setelah Deploy

### Cek Memory Usage
```bash
railway logs --service aplikasi-server
```

### Expected Behavior
- ✅ No `HIGH_MEMORY_USAGE` alerts
- ✅ Status tetap `healthy`
- ✅ Heap usage <80%

### Jika Masih Ada Issues

1. **Increase Memory Limit** (jika upgrade plan):
   ```json
   "--max-old-space-size=1024"
   ```

2. **Enable Garbage Collection Logs**:
   ```bash
   NODE_OPTIONS=--max-old-space-size=512 --expose-gc
   ```

3. **Analyze Memory Leaks**:
   ```bash
   node --inspect index.js
   ```

## 🎯 Best Practices

### DO ✅
- Set explicit memory limits
- Use compression middleware
- Minimize logging in production
- Regular `npm audit fix`
- Monitor Railway metrics

### DON'T ❌
- Log setiap request di production
- Store large objects in memory
- Keep unused dependencies
- Ignore security warnings

## 📊 Railway Free Tier Limits

```
RAM: 512MB
CPU: Shared
Disk: 1GB
Bandwidth: 100GB/month
```

**Memory Allocation Strategy:**
- Node.js heap: 512MB (--max-old-space-size)
- OS overhead: ~100MB
- Buffer: ~100MB
- Total: ~712MB (fits in 512MB with compression)

## 🔍 Troubleshooting

### Issue: Memory masih tinggi
**Solution:** Reduce cache size, disable heavy features

### Issue: App crash dengan OOM
**Solution:** Increase `--max-old-space-size` atau upgrade plan

### Issue: Slow response time
**Solution:** Enable Redis caching, optimize queries

## 📝 Next Steps

1. ✅ Update package.json dengan memory limit
2. ⏳ Update Railway environment variables
3. ⏳ Run `npm audit fix`
4. ⏳ Push changes dan monitor logs
5. ⏳ Verify health status tetap `healthy`

---

**Status:** Memory optimization implemented
**Last Updated:** 2026-04-02
