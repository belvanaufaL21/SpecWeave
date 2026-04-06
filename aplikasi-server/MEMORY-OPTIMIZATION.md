# Memory Optimization & Leak Fixes

## Masalah yang Ditemukan

Dari deploy log Railway, backend mengalami:
- Memory heap usage 90-100% secara konsisten
- Alert `SUSTAINED_HIGH_MEMORY` berulang kali
- Status health berubah antara "healthy" ↔ "degraded"
- Memory heap mencapai ~28MB dari ~30MB (>95%)

## Perbaikan yang Dilakukan

### 1. Tingkatkan Memory Limit
**File:** `package.json`
- Ubah `--max-old-space-size=512` → `--max-old-space-size=2048`
- Memberikan 2GB heap space (4x lipat)
- Solusi short-term untuk stabilitas

### 2. Fix Memory Leaks

#### A. CacheService (`src/services/cacheService.js`)
**Masalah:**
- Memory cache cleanup setiap 5 menit (terlalu lambat)
- Tidak ada GC hint

**Perbaikan:**
- Cleanup setiap 2 menit (lebih agresif)
- Tambah GC hint setiap 10 menit
- Limit `maxMemoryCacheSize` = 1000 entries

#### B. MonitoringService (`src/services/monitoringService.js`)
**Masalah:**
- Map `metrics.performance`, `metrics.errors`, `metrics.system` tumbuh tanpa batas
- Cleanup hanya 1 jam sekali
- Tidak ada size limit

**Perbaikan:**
- Cleanup lebih agresif: 30 menit (dari 1 jam)
- Tambah hard limit: max 1000 entries per Map
- Auto-delete oldest entries jika melebihi limit

#### C. HealthCheckService (`src/services/healthCheckService.js`)
**Masalah:**
- `healthHistory` menyimpan 100 entries
- Bisa tumbuh besar seiring waktu

**Perbaikan:**
- Kurangi limit: 50 entries (dari 100)
- Lebih sering cleanup

#### D. Index.js (`index.js`)
**Perbaikan:**
- Tambah periodic GC setiap 5 menit
- Log jika GC freed > 10MB
- Tambah root endpoint `/` untuk health check
- Tambah `/favicon.ico` endpoint (menghilangkan 404)

## Monitoring

### Endpoint Baru
```bash
# Health check dengan memory info
GET /

Response:
{
  "status": "ok",
  "message": "SpecWeave API Server",
  "version": "1.0.0",
  "uptime": 123.45,
  "memory": {
    "heapUsed": "25MB",
    "heapTotal": "30MB",
    "rss": "85MB"
  }
}
```

### Memory Metrics
Monitor di Railway logs:
- `heapUsed` / `heapTotal` ratio
- `SUSTAINED_HIGH_MEMORY` alerts
- GC freed messages

## Deployment

### Railway Configuration
1. Pastikan memory limit cukup (minimal 512MB, recommended 1GB)
2. Set environment variables:
   ```
   NODE_ENV=production
   CLEAN_LOGS=true
   SUPPRESS_HEALTH_WARNINGS=true
   ```

### Verifikasi
Setelah deploy, cek:
1. Memory usage stabil < 80%
2. Tidak ada `SUSTAINED_HIGH_MEMORY` alerts
3. Health status tetap "healthy"
4. Root endpoint `/` return 200 OK

## Best Practices

### Untuk Development
- Jalankan dengan `--expose-gc` untuk manual GC:
  ```bash
  node --expose-gc --max-old-space-size=2048 index.js
  ```

### Untuk Production
- Monitor memory trends di Railway dashboard
- Set alert jika memory > 85% sustained
- Review logs untuk memory leak patterns

## Troubleshooting

### Jika Memory Masih Tinggi
1. Check active connections:
   ```javascript
   process._getActiveHandles().length
   process._getActiveRequests().length
   ```

2. Profile memory:
   ```bash
   node --inspect index.js
   # Connect Chrome DevTools
   ```

3. Check for:
   - Unclosed database connections
   - Event listeners tidak di-cleanup
   - Large objects di cache
   - Circular references

### Emergency Actions
Jika memory critical (>95%):
1. Restart service
2. Check logs untuk leak source
3. Temporary: tingkatkan memory limit lagi
4. Long-term: fix leak source

## Next Steps

1. ✅ Tingkatkan memory limit (done)
2. ✅ Fix known memory leaks (done)
3. ⏳ Monitor production untuk 24-48 jam
4. ⏳ Jika stabil, consider tuning cleanup intervals
5. ⏳ Add memory profiling untuk deep analysis

## References

- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)
- [V8 Garbage Collection](https://v8.dev/blog/trash-talk)
- [Railway Memory Limits](https://docs.railway.app/reference/pricing)
