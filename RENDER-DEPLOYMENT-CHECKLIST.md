# ✅ Render Deployment Checklist - SpecWeave

## 📋 Pre-Deployment Checklist

### ✅ Step 1: Push Code ke GitHub

**Status:** Repository sudah terkonfigurasi  
**Remote:** https://github.com/MuhammadGhazivedaBelvanaufal/SpecWeave.git

**Action Required:**

```bash
# 1. Stage semua perubahan
git add .

# 2. Commit
git commit -m "Ready for Render deployment

- Complete Docker setup with dev/prod configs
- Render.com deployment configuration (render.yaml)
- Frontend: React + Vite + TailwindCSS
- Backend: Express.js + Python ML services
- Database migrations ready
- Complete documentation and deployment guides"

# 3. Push ke GitHub
git push origin main
```

**Verification:**
- [ ] Code ter-push ke GitHub
- [ ] Buka https://github.com/MuhammadGhazivedaBelvanaufal/SpecWeave
- [ ] Verify semua files ada (kecuali .env, node_modules, dll)
- [ ] Check render.yaml ada di root

---

### ✅ Step 2: Siapkan Environment Variables

Sebelum deploy, siapkan credentials berikut:

#### Required Credentials:

**1. Supabase (WAJIB)**
- [ ] `SUPABASE_URL` = https://your-project.supabase.co
- [ ] `SUPABASE_ANON_KEY` = eyJhbGc...
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = eyJhbGc...

**Cara dapat:**
1. Login ke https://supabase.com
2. Pilih project SpecWeave
3. Go to Settings → API
4. Copy URL dan keys

**2. Groq API (WAJIB)**
- [ ] `GROQ_API_KEY` = gsk_...

**Cara dapat:**
1. Login ke https://console.groq.com
2. Go to API Keys
3. Create new key atau copy existing

**3. JIRA Integration (OPTIONAL)**
- [ ] `JIRA_CLIENT_ID` = (jika pakai JIRA)
- [ ] `JIRA_CLIENT_SECRET` = (jika pakai JIRA)
- [ ] `JIRA_ENCRYPTION_KEY` = (generate random 32 char)

**Generate JIRA_ENCRYPTION_KEY:**
```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

### ✅ Step 3: Create Render Account

**Action:**
1. [ ] Buka https://dashboard.render.com
2. [ ] Sign up dengan GitHub account
3. [ ] Authorize Render to access GitHub
4. [ ] Verify email

**Tips:** Gunakan GitHub OAuth untuk login, lebih mudah untuk connect repository

---

## 🚀 Deployment Steps

### Step 4: Deploy Backend Service (10 menit)

**4.1. Create Web Service**

1. [ ] Login ke https://dashboard.render.com
2. [ ] Klik **"New +"** → **"Web Service"**
3. [ ] Klik **"Connect a repository"**
4. [ ] Pilih **"SpecWeave"** repository
5. [ ] Klik **"Connect"**

**4.2. Configure Backend Service**

Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `specweave-backend` |
| **Region** | `Singapore` (terdekat dengan Indonesia) |
| **Branch** | `main` |
| **Root Directory** | `aplikasi-server` |
| **Environment** | `Docker` |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | `Free` (untuk testing) atau `Starter ($7/mo)` |

**4.3. Set Environment Variables**

Klik **"Advanced"** → **"Add Environment Variable"**

Add these variables:

```
NODE_ENV = production
PORT = 5003

# Supabase
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...

# Groq AI
GROQ_API_KEY = gsk_...

# JIRA (Optional)
JIRA_CLIENT_ID = your_client_id
JIRA_CLIENT_SECRET = your_client_secret
JIRA_ENCRYPTION_KEY = your_generated_key

# Frontend URL (akan diupdate setelah frontend deploy)
CLIENT_URL = https://specweave-frontend.onrender.com
```

**4.4. Deploy Backend**

1. [ ] Klik **"Create Web Service"**
2. [ ] Wait for build (5-10 menit)
3. [ ] Check logs untuk errors
4. [ ] Verify deployment success

**4.5. Test Backend**

```bash
# Get backend URL dari Render dashboard
# Format: https://specweave-backend.onrender.com

# Test health endpoint
curl https://specweave-backend.onrender.com/api/system/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...}
```

**Backend URL:** `https://specweave-backend.onrender.com` ✅

---

### Step 5: Create PostgreSQL Database (5 menit)

**5.1. Create Database**

1. [ ] Di Render dashboard, klik **"New +"** → **"PostgreSQL"**
2. [ ] Configure:

| Field | Value |
|-------|-------|
| **Name** | `specweave-db` |
| **Database** | `specweave` |
| **User** | `specweave_user` |
| **Region** | `Singapore` |
| **PostgreSQL Version** | `15` (latest) |
| **Plan** | `Free` (1GB, expires 90 days) atau `Starter ($7/mo)` |

3. [ ] Klik **"Create Database"**
4. [ ] Wait for provisioning (2-3 menit)

**5.2. Get Database Connection URL**

1. [ ] Buka database dashboard
2. [ ] Copy **"Internal Database URL"**
3. [ ] Format: `postgresql://user:pass@host:5432/dbname`

**5.3. Update Backend Environment Variables**

1. [ ] Go to backend service dashboard
2. [ ] Click **"Environment"** tab
3. [ ] Add new variable:

```
DATABASE_URL = postgresql://specweave_user:password@dpg-xxx.singapore-postgres.render.com/specweave
```

4. [ ] Save changes
5. [ ] Backend akan auto-redeploy

**5.4. Run Database Migrations**

Migrations akan run otomatis saat backend start. Check logs:

```
[Migration] Running migrations...
[Migration] ✓ 001_create_tables.sql
[Migration] ✓ 002_separate_test_tables.sql
[Migration] All migrations completed successfully
```

**Database URL:** `postgresql://...` ✅

---

### Step 6: Deploy Frontend Static Site (10 menit)

**6.1. Create Static Site**

1. [ ] Klik **"New +"** → **"Static Site"**
2. [ ] Connect same **"SpecWeave"** repository
3. [ ] Configure:

| Field | Value |
|-------|-------|
| **Name** | `specweave-frontend` |
| **Region** | `Singapore` |
| **Branch** | `main` |
| **Root Directory** | `aplikasi-klien` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

**6.2. Set Frontend Environment Variables**

Klik **"Advanced"** → **"Add Environment Variable"**

```
# Backend API URL (dari Step 4)
VITE_API_BASE_URL = https://specweave-backend.onrender.com

# Supabase (same as backend)
VITE_SUPABASE_URL = https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGc...

# JIRA (Optional)
VITE_JIRA_CLIENT_ID = your_client_id
```

**6.3. Deploy Frontend**

1. [ ] Klik **"Create Static Site"**
2. [ ] Wait for build (5-10 menit)
3. [ ] Check logs untuk errors
4. [ ] Verify deployment success

**6.4. Update Backend CLIENT_URL**

1. [ ] Copy frontend URL: `https://specweave-frontend.onrender.com`
2. [ ] Go to backend service → Environment
3. [ ] Update `CLIENT_URL` variable
4. [ ] Save (backend akan auto-redeploy)

**Frontend URL:** `https://specweave-frontend.onrender.com` ✅

---

## ✅ Post-Deployment Verification

### Step 7: Test Application (5 menit)

**7.1. Test Frontend**

1. [ ] Buka https://specweave-frontend.onrender.com
2. [ ] Page loads tanpa errors
3. [ ] No console errors (F12)
4. [ ] Design tampil dengan benar

**7.2. Test Authentication**

1. [ ] Klik **"Sign Up"**
2. [ ] Register dengan email baru
3. [ ] Verify email di inbox
4. [ ] Login berhasil
5. [ ] Redirect ke dashboard

**7.3. Test Core Features**

1. [ ] **Create User Story:**
   - [ ] Klik "New Chat" atau "Create User Story"
   - [ ] Input user story text
   - [ ] AI generates scenarios
   - [ ] Scenarios tampil dengan benar

2. [ ] **Test Scenarios:**
   - [ ] Klik "Test" button
   - [ ] METEOR + Sentence-BERT analysis runs
   - [ ] Results tampil dengan metrics
   - [ ] No errors in console

3. [ ] **JIRA Integration (Optional):**
   - [ ] Connect JIRA account
   - [ ] Select project
   - [ ] Export user story
   - [ ] Verify in JIRA

**7.4. Test API Endpoints**

```bash
# Backend health
curl https://specweave-backend.onrender.com/api/system/health

# Test authentication (should return 401)
curl https://specweave-backend.onrender.com/api/templates

# Test with auth token (get from browser DevTools)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://specweave-backend.onrender.com/api/templates
```

---

## 🔧 Troubleshooting

### Issue: Backend Build Failed

**Symptoms:** Build fails with Docker errors

**Solutions:**
1. Check Dockerfile syntax
2. Verify Python dependencies in requirements.txt
3. Check build logs for specific errors
4. Try rebuilding: Dashboard → Manual Deploy → Deploy latest commit

### Issue: Frontend Build Failed

**Symptoms:** Build fails with npm errors

**Solutions:**
1. Verify package.json dependencies
2. Check if VITE_ env vars are set
3. Review build logs
4. Try: Clear build cache → Redeploy

### Issue: Backend Can't Connect to Database

**Symptoms:** 500 errors, "database connection failed"

**Solutions:**
1. Verify DATABASE_URL is set correctly
2. Check database is running (Render dashboard)
3. Verify database region matches backend region
4. Check backend logs for connection errors

### Issue: Frontend Can't Connect to Backend (CORS)

**Symptoms:** CORS errors in browser console

**Solutions:**
1. Verify CLIENT_URL in backend matches frontend URL
2. Check VITE_API_BASE_URL in frontend
3. Ensure both services are deployed
4. Check backend logs for CORS errors

### Issue: Cold Start Slow (Free Tier)

**Symptoms:** First request takes 30+ seconds

**Solutions:**
1. This is normal for free tier (spins down after 15 min)
2. Upgrade to Starter plan ($7/mo) for always-on
3. Use a uptime monitor to keep it alive (e.g., UptimeRobot)

### Issue: Python ML Services Fail

**Symptoms:** METEOR/Sentence-BERT errors

**Solutions:**
1. Check backend logs for Python errors
2. Verify NLTK data downloaded during build
3. Check sentence-transformers model loaded
4. May need to increase instance size (more RAM)

---

## 📊 Deployment Summary

### Services Created:

| Service | Type | URL | Cost |
|---------|------|-----|------|
| **Backend** | Web Service (Docker) | https://specweave-backend.onrender.com | Free or $7/mo |
| **Frontend** | Static Site | https://specweave-frontend.onrender.com | Free |
| **Database** | PostgreSQL | Internal only | Free or $7/mo |

### Total Cost:

**Free Tier (Testing):**
- Backend: Free (750 hours/month, sleeps after 15 min)
- Frontend: Free (100GB bandwidth)
- Database: Free (1GB, expires after 90 days)
- **Total: $0/month**

**Starter Tier (Production):**
- Backend: $7/month (always-on, 512MB RAM)
- Frontend: Free
- Database: $7/month (1GB persistent)
- **Total: $14/month (~Rp 220k)**

**Recommended Production:**
- Backend Standard: $25/month (2GB RAM for ML)
- Frontend: Free
- Database Starter: $7/month
- **Total: $32/month (~Rp 500k)**

---

## 🎯 Next Steps After Deployment

### 1. Setup Custom Domain (Optional)

**If you have a domain:**

1. [ ] Go to frontend service → Settings → Custom Domain
2. [ ] Add your domain (e.g., specweave.com)
3. [ ] Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: specweave-frontend.onrender.com
   ```
4. [ ] SSL will be auto-configured by Render
5. [ ] Update backend CLIENT_URL to your domain

### 2. Setup Monitoring

**Render Built-in:**
- [ ] Enable email alerts for deploy failures
- [ ] Monitor metrics in dashboard
- [ ] Check logs regularly

**External Monitoring:**
- [ ] Setup UptimeRobot (free) untuk uptime monitoring
- [ ] Setup Sentry (optional) untuk error tracking
- [ ] Setup Google Analytics (optional)

### 3. Backup Strategy

**Database Backups:**
- Free tier: No automatic backups
- Paid tier: Daily automatic backups
- Manual: Use `pg_dump` to backup

**Code Backups:**
- Already backed up in GitHub
- Consider creating release tags

### 4. Performance Optimization

**If using free tier:**
- [ ] Setup uptime monitor to prevent cold starts
- [ ] Optimize bundle size
- [ ] Enable caching

**If upgrading:**
- [ ] Upgrade backend to Standard ($25/mo) for better ML performance
- [ ] Enable CDN for frontend assets
- [ ] Setup Redis cache (optional)

---

## 📞 Support & Resources

### Render Documentation
- [Render Docs](https://render.com/docs)
- [Deploy from GitHub](https://render.com/docs/deploy-from-github)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Docker Deployment](https://render.com/docs/docker)

### SpecWeave Documentation
- [RENDER-DEPLOYMENT.md](./RENDER-DEPLOYMENT.md) - Detailed guide
- [README.md](./README.md) - Main documentation
- [README-DOCKER.md](./README-DOCKER.md) - Docker/VPS alternative

### Community
- [Render Community](https://community.render.com)
- [Render Status](https://status.render.com)

---

## ✅ Deployment Checklist Summary

- [ ] **Step 1:** Push code ke GitHub
- [ ] **Step 2:** Siapkan environment variables
- [ ] **Step 3:** Create Render account
- [ ] **Step 4:** Deploy backend service
- [ ] **Step 5:** Create PostgreSQL database
- [ ] **Step 6:** Deploy frontend static site
- [ ] **Step 7:** Test application end-to-end

**Estimated Total Time:** 30-40 minutes

---

## 🎉 Selamat!

Jika semua checklist sudah ✅, aplikasi SpecWeave kamu sudah live di internet!

**Your URLs:**
- Frontend: https://specweave-frontend.onrender.com
- Backend: https://specweave-backend.onrender.com

Share dengan team dan mulai testing! 🚀

---

**Last Updated:** 1 April 2026  
**Version:** 1.0.0
