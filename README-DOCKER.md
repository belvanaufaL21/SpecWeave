# SpecWeave Docker Deployment Guide

Panduan lengkap untuk deployment SpecWeave menggunakan Docker dan Docker Compose.

## Daftar Isi

- [Prerequisites](#prerequisites)
- [Environment Variables Setup](#environment-variables-setup)
- [Development Mode](#development-mode)
- [Production Mode](#production-mode)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Maintenance](#maintenance)
- [Cloud Deployment](#cloud-deployment)

---

## Prerequisites

Sebelum memulai, pastikan sistem Anda memiliki:

### Software Requirements

- **Docker**: Version 20.10 atau lebih tinggi
  - Download: https://docs.docker.com/get-docker/
  - Verify: `docker --version`

- **Docker Compose**: Version 2.0 atau lebih tinggi
  - Biasanya sudah termasuk dalam Docker Desktop
  - Verify: `docker-compose --version`

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 10 GB free space

**Recommended:**
- CPU: 4 cores atau lebih
- RAM: 8 GB atau lebih
- Disk: 20 GB free space

### Network Requirements

- Port 3000 (Frontend - Development)
- Port 5003 (Backend API)
- Port 80 (HTTP - Production)
- Port 443 (HTTPS - Production)

---

## Environment Variables Setup

### 1. Copy Template File

```bash
cp .env.example .env
```

### 2. Configure Required Variables

Edit file `.env` dan isi variabel berikut:

#### Supabase Configuration (REQUIRED)

Dapatkan dari Supabase Dashboard → Settings → API:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

#### Groq AI API Key (REQUIRED)

Dapatkan dari https://console.groq.com/keys:

```env
GROQ_API_KEY=your_groq_api_key_here
```

#### API Base URL

**Development:**
```env
VITE_API_BASE_URL=http://localhost:5003
CLIENT_URL=http://localhost:3000
```

**Production:**
```env
VITE_API_BASE_URL=/api
CLIENT_URL=https://yourdomain.com
```

#### Security Configuration

**IMPORTANT:** Ganti dengan key yang kuat untuk production:

```env
JIRA_ENCRYPTION_KEY=change-this-to-a-strong-random-key-in-production
```

Generate random key:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Verify Configuration

Pastikan semua variabel REQUIRED sudah diisi. Lihat `.env.example` untuk deskripsi lengkap setiap variabel.

---

## Development Mode

Mode development menggunakan hot-reload untuk frontend (Vite) dan backend (Nodemon).

### Build Images

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
```

### Start Services

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Atau jalankan di background:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5003
- **Health Check**: http://localhost:5003/api/health

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Rebuild After Changes

Jika ada perubahan pada dependencies (package.json, requirements.txt):

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## Production Mode

Mode production menggunakan Nginx reverse proxy dengan optimasi untuk performa dan keamanan.

### Build Production Images

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
```

### Start Services

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Access Application

- **HTTP**: http://localhost (port 80)
- **HTTPS**: https://localhost (port 443, jika SSL dikonfigurasi)
- **Health Check**: http://localhost/api/health

### Configure SSL/HTTPS

SpecWeave mendukung HTTPS untuk production deployment dengan Let's Encrypt atau self-signed certificates.

#### Quick Setup (Let's Encrypt - Recommended)

```bash
# Run automated setup script
bash scripts/setup-letsencrypt.sh yourdomain.com your@email.com
```

#### Manual Setup

1. **Obtain SSL Certificate**

For production with domain (Let's Encrypt):
```bash
docker run -it --rm \
    -v "$PWD/nginx/ssl:/etc/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email your@email.com \
    -d yourdomain.com
```

2. **Copy Certificates**

```bash
mkdir -p nginx/ssl
cp nginx/ssl/live/yourdomain.com/fullchain.pem nginx/ssl/certificate.crt
cp nginx/ssl/live/yourdomain.com/privkey.pem nginx/ssl/private.key
chmod 644 nginx/ssl/certificate.crt
chmod 600 nginx/ssl/private.key
```

3. **Enable HTTPS in Nginx**

Edit `nginx/default.conf`:
- Uncomment HTTPS server block (line ~150)
- Update `server_name` to your domain
- Uncomment HTTP to HTTPS redirect

4. **Update Environment Variables**

Edit `.env`:
```bash
DOMAIN=yourdomain.com
VITE_API_BASE_URL=https://yourdomain.com/api
CLIENT_URL=https://yourdomain.com
```

5. **Rebuild and Restart**

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Certificate Renewal

Setup automatic renewal with cron:
```bash
# Edit crontab
crontab -e

# Add renewal job (daily at 2 AM)
0 2 * * * /path/to/scripts/renew-letsencrypt.sh >> /var/log/ssl-renewal.log 2>&1
```

#### Verify HTTPS

```bash
# Test HTTPS
curl -I https://yourdomain.com

# Test SSL grade
# Visit: https://www.ssllabs.com/ssltest/
```

**📚 Detailed Guide**: See `.kiro/specs/docker-deployment-setup/SSL-HTTPS-SETUP-GUIDE.md`

### Stop Services

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Update Production Deployment

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting Guide

### Common Issues dan Solutions

#### 1. Port Already in Use

**Error:**
```
Error starting userland proxy: listen tcp 0.0.0.0:3000: bind: address already in use
```

**Solution:**
```bash
# Check what's using the port
# Linux/Mac
lsof -i :3000

# Windows
netstat -ano | findstr :3000

# Stop the conflicting process or change port in docker-compose
```

#### 2. Container Fails to Start

**Check logs:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Common causes:**
- Missing environment variables → Check `.env` file
- Invalid Supabase credentials → Verify keys
- Port conflicts → Change ports in docker-compose

#### 3. Frontend Can't Connect to Backend

**Symptoms:**
- API calls fail with CORS errors
- Network errors in browser console

**Solution:**
```bash
# Verify backend is running
docker ps | grep specweave-backend

# Check backend health
curl http://localhost:5003/api/health

# Verify VITE_API_BASE_URL in .env
# Development: http://localhost:5003
# Production: /api (uses reverse proxy)
```

#### 4. Python Services Fail

**Error:**
```
ModuleNotFoundError: No module named 'nltk'
```

**Solution:**
```bash
# Rebuild backend image to reinstall Python dependencies
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache backend
```

#### 5. Volume Permission Issues

**Error:**
```
Error: EACCES: permission denied
```

**Solution:**
```bash
# Linux/Mac: Fix volume permissions
docker-compose down
docker volume rm specweave-backend-logs
docker-compose up -d

# Or run with proper user permissions
```

#### 6. Out of Memory

**Error:**
```
Container killed due to OOM
```

**Solution:**
```bash
# Increase Docker memory limit in Docker Desktop settings
# Or add memory limits in docker-compose.prod.yml

# Check current memory usage
docker stats
```

#### 7. Build Fails with Network Timeout

**Solution:**
```bash
# Increase Docker build timeout
export DOCKER_BUILDKIT=1
export COMPOSE_HTTP_TIMEOUT=200

# Or use different npm registry
docker-compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
```

### Health Check Script

Gunakan script untuk verify semua services:

```bash
# Linux/Mac
./scripts/health-check.sh

# Windows (Git Bash)
bash scripts/health-check.sh

# Windows (PowerShell)
# Requires WSL or Git Bash
```

Output akan menampilkan status:
- ✓ Service running dan healthy
- ✗ Service stopped atau unhealthy
- ⚠ Warning atau skipped checks

---

## Maintenance

### Backup

#### Backup Docker Volumes

```bash
# Backup backend logs
./scripts/backup-volumes.sh specweave-backend-logs ./backups

# Backup NLTK data
./scripts/backup-volumes.sh specweave-nltk-data ./backups

# Backup PyTorch models
./scripts/backup-volumes.sh specweave-torch-models ./backups
```

#### Backup Database

Untuk Supabase, gunakan Supabase Dashboard atau CLI:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql
```

#### Backup Environment Variables

```bash
# Copy .env file to secure location
cp .env .env.backup.$(date +%Y%m%d)
```

### Restore

#### Restore Docker Volumes

```bash
# Restore from backup
./scripts/restore-volumes.sh specweave-backend-logs ./backups/specweave-backend-logs_20240101_120000.tar.gz
```

#### Restore Database

```bash
# Using Supabase CLI
supabase db reset
psql -h your-project.supabase.co -U postgres -d postgres -f backup.sql
```

### Health Check

#### Manual Health Check

```bash
# Run health check script
./scripts/health-check.sh
```

#### Automated Health Monitoring

Setup cron job untuk periodic health checks:

```bash
# Linux/Mac crontab
# Check every 5 minutes
*/5 * * * * /path/to/specweave/scripts/health-check.sh >> /var/log/specweave-health.log 2>&1
```

#### Health Check Endpoints

- **Backend Health**: `GET /api/health`
  - Returns: `{ "status": "ok", "timestamp": "..." }`
  
- **Backend Performance**: `GET /api/performance`
  - Returns: Performance metrics

### Log Management

#### View Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend

# Save logs to file
docker-compose logs > logs_$(date +%Y%m%d).txt
```

#### Log Rotation

Docker automatically rotates logs. Configure in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### Cleanup

#### Remove Stopped Containers

```bash
docker-compose down
```

#### Remove Volumes (CAUTION: Data will be lost)

```bash
docker-compose down -v
```

#### Clean Up Docker System

```bash
# Remove unused images, containers, networks
docker system prune

# Remove everything including volumes (DANGEROUS)
docker system prune -a --volumes
```

### Update Strategy

#### Zero-Downtime Update (Production)

```bash
# 1. Pull latest code
git pull

# 2. Build new images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 3. Recreate containers with new images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build backend

# 4. Wait for health check
sleep 10
curl http://localhost/api/health

# 5. Update frontend
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build frontend
```

---

## Cloud Deployment

### AWS Deployment

#### Using AWS ECS (Elastic Container Service)

1. **Push Images to ECR:**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag images
docker tag specweave-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/specweave-frontend:latest
docker tag specweave-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/specweave-backend:latest

# Push images
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/specweave-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/specweave-backend:latest
```

2. **Create ECS Task Definition:**

```json
{
  "family": "specweave",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/specweave-backend:latest",
      "portMappings": [{"containerPort": 5003}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {"name": "SUPABASE_SERVICE_ROLE_KEY", "valueFrom": "arn:aws:secretsmanager:..."}
      ]
    }
  ]
}
```

3. **Create ECS Service with Load Balancer**

#### Using AWS EC2

```bash
# SSH to EC2 instance
ssh -i key.pem ec2-user@<instance-ip>

# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone <your-repo-url>
cd specweave

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Google Cloud Platform (GCP)

#### Using Cloud Run

1. **Build and Push to GCR:**

```bash
# Configure gcloud
gcloud auth configure-docker

# Build images
docker build -t gcr.io/<project-id>/specweave-frontend:latest ./aplikasi-klien
docker build -t gcr.io/<project-id>/specweave-backend:latest ./aplikasi-server

# Push images
docker push gcr.io/<project-id>/specweave-frontend:latest
docker push gcr.io/<project-id>/specweave-backend:latest
```

2. **Deploy to Cloud Run:**

```bash
# Deploy backend
gcloud run deploy specweave-backend \
  --image gcr.io/<project-id>/specweave-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=supabase-key:latest

# Deploy frontend
gcloud run deploy specweave-frontend \
  --image gcr.io/<project-id>/specweave-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Using GKE (Google Kubernetes Engine)

```bash
# Create cluster
gcloud container clusters create specweave-cluster --num-nodes=3

# Deploy using kubectl
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### Microsoft Azure

#### Using Azure Container Instances

```bash
# Login to Azure
az login

# Create resource group
az group create --name specweave-rg --location eastus

# Create container registry
az acr create --resource-group specweave-rg --name specweaveacr --sku Basic

# Build and push images
az acr build --registry specweaveacr --image specweave-backend:latest ./aplikasi-server
az acr build --registry specweaveacr --image specweave-frontend:latest ./aplikasi-klien

# Deploy container group
az container create \
  --resource-group specweave-rg \
  --name specweave-backend \
  --image specweaveacr.azurecr.io/specweave-backend:latest \
  --dns-name-label specweave-api \
  --ports 5003 \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables SUPABASE_SERVICE_ROLE_KEY=<key>
```

#### Using Azure App Service

```bash
# Create App Service plan
az appservice plan create --name specweave-plan --resource-group specweave-rg --is-linux

# Create web app
az webapp create --resource-group specweave-rg --plan specweave-plan --name specweave-app --deployment-container-image-name specweaveacr.azurecr.io/specweave-backend:latest

# Configure environment variables
az webapp config appsettings set --resource-group specweave-rg --name specweave-app --settings NODE_ENV=production
```

### DigitalOcean

#### Using App Platform

1. Connect GitHub repository
2. Configure build settings:
   - **Backend**: Dockerfile at `aplikasi-server/Dockerfile`
   - **Frontend**: Dockerfile at `aplikasi-klien/Dockerfile`
3. Set environment variables in dashboard
4. Deploy

#### Using Droplet

```bash
# SSH to droplet
ssh root@<droplet-ip>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Deploy application
git clone <your-repo-url>
cd specweave
cp .env.example .env
nano .env  # Edit with production values
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Variables for Cloud

Untuk cloud deployment, gunakan secrets management:

- **AWS**: AWS Secrets Manager atau Parameter Store
- **GCP**: Secret Manager
- **Azure**: Key Vault
- **DigitalOcean**: App Platform Environment Variables

**Never** commit `.env` file dengan credentials ke repository!

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Supabase Documentation](https://supabase.com/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

Jika mengalami masalah:

1. Check [Troubleshooting Guide](#troubleshooting-guide)
2. Run health check: `./scripts/health-check.sh`
3. Check logs: `docker-compose logs`
4. Open issue di repository

---

**Last Updated**: 2024
**Version**: 1.0.0
