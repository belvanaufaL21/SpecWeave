# Railway Frontend Deployment Guide

## Step-by-Step: Deploy SpecWeave Frontend

### 1. Create New Service di Railway

1. Buka Railway Dashboard
2. Klik project SpecWeave Anda
3. Klik "New" → "Service"
4. Pilih "GitHub Repo"
5. Pilih repository: `belvanaufaL21/SpecWeave`
6. Beri nama service: `specweave-frontend`

### 2. Set Root Directory

Di Settings → Source:
- Klik "Add Root Directory"
- Input: `aplikasi-klien`
- Save

### 3. Set Environment Variables

Di Variables tab, tambahkan:

```env
# Supabase (sama dengan backend)
VITE_SUPABASE_URL=https://nthylrvtkaqqixznrtaj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50aHlscnZ0a2FxcWl4em5ydGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzI2ODUsImV4cCI6MjA4MjM0ODY4NX0.BvrzkntSYryfGQEgK34nf970FYP0M1Y-6bE9o16Tcik

# Backend API URL (GANTI dengan URL backend Railway Anda!)
VITE_API_URL=https://your-backend-service.railway.app/api

# Optional Logging
VITE_ENABLE_STARTUP_MESSAGE=false
VITE_LOG_LEVEL=warn
```

**PENTING:** Ganti `VITE_API_URL` dengan URL backend Railway yang sudah di-deploy!

Cara mendapatkan backend URL:
1. Buka service backend di Railway
2. Go to Settings → Networking
3. Copy "Public Domain" URL
4. Tambahkan `/api` di akhir

Contoh: `https://specweave-backend-production.up.railway.app/api`

### 4. Deploy

Railway akan otomatis build dan deploy setelah Anda:
- Set Root Directory
- Set Environment Variables
- Push changes ke GitHub (sudah dilakukan)

### 5. Verifikasi Deployment

Setelah deploy selesai:

1. **Cek Build Logs** - Pastikan tidak ada error
2. **Cek Deploy Logs** - Pastikan server running
3. **Buka Public URL** - Test aplikasi

Expected logs:
```
✓ built in XXXms
Server running on port 3000
```

### 6. Test Aplikasi

1. Buka URL frontend Railway
2. Test login/register
3. Test create user story
4. Test generate Gherkin
5. Pastikan komunikasi frontend-backend berjalan

## Troubleshooting

### Build Failed: "Cannot find module"
- Pastikan Root Directory = `aplikasi-klien`
- Cek package.json ada di `aplikasi-klien/package.json`

### Runtime Error: "Network Error" atau "Failed to fetch"
- Cek `VITE_API_URL` sudah benar
- Pastikan backend sudah running
- Cek CORS settings di backend

### Blank Page / White Screen
- Buka browser console (F12)
- Cek error messages
- Pastikan environment variables sudah di-set

### API Calls Failing
- Verify `VITE_API_URL` format: `https://domain.railway.app/api`
- Test backend health: `curl https://your-backend.railway.app/api/health`
- Cek backend logs untuk error

## CORS Configuration

Jika ada CORS error, update backend `aplikasi-server/index.js`:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-frontend.railway.app', // Tambahkan frontend URL
];
```

## Next Steps After Deployment

1. ✅ Test semua fitur aplikasi
2. ✅ Setup custom domain (optional)
3. ✅ Monitor logs dan performance
4. ✅ Setup environment untuk staging/production

## Custom Domain (Optional)

Di Railway Settings → Networking:
1. Klik "Add Custom Domain"
2. Input domain Anda (e.g., `specweave.yourdomain.com`)
3. Update DNS records sesuai instruksi Railway
4. Update `VITE_API_URL` jika backend juga pakai custom domain

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_ENABLE_STARTUP_MESSAGE` | No | Show startup logs (default: true) |
| `VITE_LOG_LEVEL` | No | Log level: debug/info/warn/error (default: info) |

## Architecture Overview

```
User Browser
    ↓
Frontend (Railway) - aplikasi-klien
    ↓ API Calls
Backend (Railway) - aplikasi-server
    ↓
Supabase Database
```

Both services deployed on Railway, communicating via HTTPS.
