# SpecWeave Deployment Guide untuk Render.com

## 🚀 Quick Start (30 Menit dari Nol ke Live!)

### Prerequisites
- ✅ GitHub account
- ✅ Render.com account (gratis)
- ✅ Code sudah di-push ke GitHub

---

## 📋 Step-by-Step Deployment

### Step 1: Push Code ke GitHub (10 menit)

```bash
# 1. Initialize git (jika belum)
git init

# 2. Add all files
git add .

# 3. Commit
git commit -m "Initial commit: SpecWeave for Render deployment"

# 4. Create repo di GitHub, lalu push
git remote add origin https://github.com/YOUR_USERNAME/specweave.git
git push -u origin main
```

---

### Step 2: Deploy Backend (10 menit)

#### 2.1 Create Web Service

1. Login ke https://dashboard.render.com
2. Klik **"New +"** → **"Web Service"**
3. Connect GitHub repository:
   - Klik "Connect account" (jika belum)
   - Authorize Render
   - Pilih repository **specweave**

#### 2.2 Configure Backend Service

**Basic Settings:**
- **Name**: `specweave-backend`
- **Region**: Singapore (terdekat dengan Indonesia)
- **Branch**: `main`
- **Root Directory**: `aplikasi-server`
- **Environment**: `Docker`
- **Dockerfile Path**: `./Dockerfile`

**Instance Type:**
- **Free** (untuk testing, sleep after 15 min)
- **Starter** ($7/month, always on, 512MB RAM) - Recommended
- **Standard** ($25/month, 2GB RAM) - Production

**Advanced Settings:**
- **Health Check Path**: `/api/system/health`
- **Auto-Deploy**: Yes (deploy on git push)

#### 2.3 Set Environment Variables

Klik **"Environment"** tab, lalu add:

```bash
# Required
NODE_ENV=production
PORT=5003
CLIENT_URL=https://specweave-frontend.onrender.com

# Supabase (ganti dengan credentials kamu)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (akan auto-fill setelah create database)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Groq API (ganti dengan API key kamu)
GROQ_API_KEY=your-groq-api-key

# JIRA (optional)
JIRA_ENCRYPTION_KEY=your-encryption-key

# Python & Logging
PYTHON_PATH=python3
LOG_LEVEL=info
HEALTH_CHECK_VERBOSE=false
```

#### 2.4 Deploy

1. Klik **"Create Web Service"**
2. Render akan:
   - Clone repository
   - Build Docker image
   - Deploy container
   - Assign URL: `https://specweave-backend.onrender.com`

**Build time:** ~5-10 menit (first deploy)

---

### Step 3: Create Database (5 menit)

#### 3.1 Create PostgreSQL Database

1. Di Render Dashboard, klik **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `specweave-db`
   - **Database**: `specweave`
   - **User**: `specweave_user`
   - **Region**: Singapore
   - **Plan**: 
     - **Free** (1GB, expires after 90 days)
     - **Starter** ($7/month, 1GB, persistent)

3. Klik **"Create Database"**

#### 3.2 Connect Database to Backend

1. Setelah database ready, copy **"Internal Database URL"**
2. Go to Backend service → **Environment** tab
3. Update `DATABASE_URL` dengan URL yang di-copy
4. Klik **"Save Changes"**
5. Backend akan auto-redeploy

#### 3.3 Run Migrations

Setelah backend running:

**Option 1: Via Render Shell**
```bash
# Di Render Dashboard → Backend Service → Shell
cd /app
npm run migrate
```

**Option 2: Via Local (Connect to Render DB)**
```bash
# Set DATABASE_URL ke Render database
export DATABASE_URL="postgresql://user:pass@host:5432/db"
cd aplikasi-server
npm run migrate
```

---

### Step 4: Deploy Frontend (5 menit)

#### 4.1 Create Static Site

1. Klik **"New +"** → **"Static Site"**
2. Connect same GitHub repository
3. Configure:

**Basic Settings:**
- **Name**: `specweave-frontend`
- **Branch**: `main`
- **Root Directory**: Leave blank (atau `/`)
- **Build Command**: `cd aplikasi-klien && npm install && npm run build`
- **Publish Directory**: `aplikasi-klien/dist`

**Advanced:**
- **Auto-Deploy**: Yes
- **Pull Request Previews**: Yes (optional)

#### 4.2 Set Environment Variables

Klik **"Environment"** tab:

```bash
# Backend API URL (ganti dengan URL backend kamu)
VITE_API_URL=https://specweave-backend.onrender.com/api

# Supabase (sama dengan backend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional
VITE_LOG_LEVEL=error
VITE_ENABLE_CONSOLE_LOGS=true
```

#### 4.3 Deploy

1. Klik **"Create Static Site"**
2. Render akan:
   - Clone repository
   - Run build command
   - Deploy static files to CDN
   - Assign URL: `https://specweave-frontend.onrender.com`

**Build time:** ~3-5 menit

---

### Step 5: Verify Deployment (2 menit)

#### 5.1 Test Backend

```bash
# Health check
curl https://specweave-backend.onrender.com/api/system/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "database": "connected"
}
```

#### 5.2 Test Frontend

1. Buka browser: `https://specweave-frontend.onrender.com`
2. Verify:
   - ✅ Page loads
   - ✅ Can login/register
   - ✅ Can create user story
   - ✅ API calls work

---

## 🎯 URLs Setelah Deployment

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://specweave-frontend.onrender.com | Public |
| **Backend API** | https://specweave-backend.onrender.com/api | Public |
| **Database** | Internal only | Private |

---

## 💰 Biaya

### Free Tier (Testing/Demo)
- Frontend: **FREE** (Static Site)
- Backend: **FREE** (750 hours/month, sleep after 15 min)
- Database: **FREE** (1GB, expires after 90 days)
- **Total: $0/month**

**Limitations:**
- Backend sleeps after 15 min inactive (cold start ~30s)
- Database expires after 90 days
- 750 hours/month limit

### Paid Tier (Production)
- Frontend: **FREE** (Static Site)
- Backend Starter: **$7/month** (always on, 512MB RAM)
- Database Starter: **$7/month** (1GB persistent)
- **Total: $14/month (~Rp 220k)**

### Recommended for Production
- Frontend: **FREE**
- Backend Standard: **$25/month** (2GB RAM)
- Database Starter: **$7/month**
- **Total: $32/month (~Rp 500k)**

---

## 🔧 Configuration Tips

### 1. Environment Variables Best Practices

**Backend (.env):**
```bash
# Use Render's built-in DATABASE_URL
DATABASE_URL=${DATABASE_URL}

# Set proper NODE_ENV
NODE_ENV=production

# Use internal service URLs for service-to-service communication
# (faster, no external network)
```

**Frontend (.env):**
```bash
# Always use HTTPS URLs
VITE_API_URL=https://specweave-backend.onrender.com/api

# Never commit real API keys
# Set them in Render dashboard
```

### 2. Auto-Deploy on Git Push

Render automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Update feature"
git push origin main
# Render auto-deploys! 🚀
```

### 3. Rollback to Previous Version

1. Go to service → **"Events"** tab
2. Find previous successful deploy
3. Click **"Rollback"**

### 4. View Logs

**Backend logs:**
```
Dashboard → Backend Service → Logs
```

**Frontend build logs:**
```
Dashboard → Frontend Site → Logs
```

### 5. Custom Domain (Optional)

#### Add Custom Domain:

1. Buy domain (Namecheap, Cloudflare, etc)
2. In Render:
   - Go to Frontend service
   - Click **"Settings"** → **"Custom Domain"**
   - Add domain: `specweave.com`
3. Update DNS at registrar:
   ```
   Type: CNAME
   Name: @
   Value: specweave-frontend.onrender.com
   ```
4. Wait for DNS propagation (5-30 min)
5. **SSL automatically enabled!** ✅

---

## 🐛 Troubleshooting

### Backend Not Starting

**Check logs:**
```
Dashboard → Backend Service → Logs
```

**Common issues:**
- ❌ Missing environment variables
- ❌ Database connection failed
- ❌ Port mismatch (must be 5003)
- ❌ Health check failing

**Solutions:**
1. Verify all env vars set
2. Check DATABASE_URL is correct
3. Ensure PORT=5003
4. Test health endpoint locally

### Frontend Build Failed

**Check build logs:**
```
Dashboard → Frontend Site → Logs
```

**Common issues:**
- ❌ Build command wrong
- ❌ Missing VITE_ env vars
- ❌ npm install failed

**Solutions:**
1. Verify build command: `cd aplikasi-klien && npm install && npm run build`
2. Check all VITE_ env vars set
3. Test build locally: `npm run build`

### API Calls Failing (CORS)

**Symptoms:**
- Frontend loads but API calls fail
- CORS errors in browser console

**Solutions:**
1. Verify `CLIENT_URL` in backend env vars
2. Check `VITE_API_URL` in frontend env vars
3. Ensure URLs use HTTPS

### Database Connection Failed

**Check:**
1. DATABASE_URL format correct
2. Database service is running
3. Backend has access to database

**Fix:**
1. Copy "Internal Database URL" from database service
2. Update backend DATABASE_URL
3. Redeploy backend

---

## 📊 Monitoring

### Health Checks

Render automatically monitors:
- Backend: `/api/system/health` every 30s
- Frontend: Root path `/` every 30s

### Alerts

Configure alerts:
1. Go to service → **"Settings"** → **"Notifications"**
2. Add email or Slack webhook
3. Get notified on:
   - Deploy failures
   - Service crashes
   - Health check failures

### Metrics

View metrics:
```
Dashboard → Service → Metrics
```

Shows:
- CPU usage
- Memory usage
- Request count
- Response times

---

## 🚀 Next Steps

### 1. Setup Custom Domain
- Buy domain ($9/year)
- Point DNS to Render
- SSL auto-enabled

### 2. Enable Auto-Deploy
- Already enabled by default
- Push to main = auto deploy

### 3. Setup Monitoring
- Add email alerts
- Monitor logs
- Track metrics

### 4. Optimize Performance
- Upgrade to paid tier (no cold starts)
- Enable CDN (already enabled for static site)
- Add caching headers

### 5. Backup Database
- Render auto-backups on paid plans
- Or setup manual backups via pg_dump

---

## 📚 Resources

- **Render Docs**: https://render.com/docs
- **Render Status**: https://status.render.com
- **Render Community**: https://community.render.com
- **Support**: support@render.com

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Backend service created
- [ ] Backend environment variables set
- [ ] Database created
- [ ] Database connected to backend
- [ ] Migrations run
- [ ] Frontend static site created
- [ ] Frontend environment variables set
- [ ] Frontend deployed
- [ ] Backend health check passing
- [ ] Frontend accessible
- [ ] API calls working
- [ ] Custom domain added (optional)
- [ ] Monitoring setup
- [ ] Alerts configured

---

**Selamat! SpecWeave kamu sudah live di Render.com!** 🎉

**URLs:**
- Frontend: https://specweave-frontend.onrender.com
- Backend: https://specweave-backend.onrender.com/api

**Total waktu deployment: ~30 menit**
**Total biaya: $0 (free tier) atau $14-32/bulan (production)**
