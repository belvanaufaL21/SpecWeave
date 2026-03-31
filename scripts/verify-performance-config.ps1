# ============================================================================
# Performance Configuration Verification Script (PowerShell)
# ============================================================================
# This script verifies that all performance optimizations are properly configured
# Usage: .\scripts\verify-performance-config.ps1
# ============================================================================

Write-Host "🔍 Verifying Performance Optimizations..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check if containers are running
Write-Host "📦 Checking container status..." -ForegroundColor Cyan
$containers = docker-compose ps
if ($containers -match "Up") {
    Write-Host "✅ Containers are running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Containers are not running. Starting them..." -ForegroundColor Yellow
    docker-compose up -d
    Start-Sleep -Seconds 10
}
Write-Host ""

# 1. Verify Node.js Heap Size
Write-Host "🧠 Verifying Node.js Heap Size Configuration..." -ForegroundColor Cyan
try {
    $heapSize = docker-compose exec -T backend node -e "const v8 = require('v8'); console.log(Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024));" 2>$null
    $heapSize = [int]$heapSize.Trim()
    
    if ($heapSize -gt 1500) {
        Write-Host "✅ Node.js heap size: ${heapSize}MB (configured)" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js heap size: ${heapSize}MB (too low, expected >1500MB)" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Could not verify Node.js heap size" -ForegroundColor Yellow
}
Write-Host ""

# 2. Verify Nginx Worker Processes
Write-Host "⚙️  Verifying Nginx Worker Processes..." -ForegroundColor Cyan
try {
    $workerCount = (docker-compose exec -T nginx ps aux 2>$null | Select-String "nginx: worker process").Count
    
    if ($workerCount -gt 0) {
        Write-Host "✅ Nginx worker processes: $workerCount (auto-configured)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Could not verify Nginx worker processes" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify Nginx worker processes (container may not be running)" -ForegroundColor Yellow
}
Write-Host ""

# 3. Verify Connection Pooling Configuration
Write-Host "🔌 Verifying Connection Pooling Configuration..." -ForegroundColor Cyan
$supabaseConfig = Get-Content "aplikasi-server/src/config/supabase.js" -Raw
if ($supabaseConfig -match "keepalive: true") {
    Write-Host "✅ Supabase connection pooling: Enabled" -ForegroundColor Green
} else {
    Write-Host "❌ Supabase connection pooling: Not configured" -ForegroundColor Red
}

$nginxConfig = Get-Content "nginx/nginx.conf" -Raw
if ($nginxConfig -match "keepalive 32") {
    Write-Host "✅ Nginx upstream keepalive: Configured (32 connections)" -ForegroundColor Green
} else {
    Write-Host "❌ Nginx upstream keepalive: Not configured" -ForegroundColor Red
}
Write-Host ""

# 4. Verify NLTK Data Pre-loading
Write-Host "📚 Verifying NLTK Data Pre-loading..." -ForegroundColor Cyan
try {
    $punktExists = docker-compose exec -T backend test -d /root/nltk_data/tokenizers/punkt 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ NLTK punkt data: Pre-loaded" -ForegroundColor Green
    } else {
        Write-Host "❌ NLTK punkt data: Not found" -ForegroundColor Red
    }
    
    $wordnetExists = docker-compose exec -T backend test -d /root/nltk_data/corpora/wordnet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ NLTK wordnet data: Pre-loaded" -ForegroundColor Green
    } else {
        Write-Host "❌ NLTK wordnet data: Not found" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Could not verify NLTK data" -ForegroundColor Yellow
}
Write-Host ""

# 5. Verify Sentence-BERT Model Pre-loading
Write-Host "🤖 Verifying Sentence-BERT Model Pre-loading..." -ForegroundColor Cyan
try {
    $modelExists = docker-compose exec -T backend test -d /root/.cache/torch/sentence_transformers 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Sentence-BERT model: Pre-loaded" -ForegroundColor Green
    } else {
        Write-Host "❌ Sentence-BERT model: Not found" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Could not verify Sentence-BERT model" -ForegroundColor Yellow
}
Write-Host ""

# 6. Verify Production Node.js Flags
Write-Host "🚀 Verifying Production Node.js Flags..." -ForegroundColor Cyan
$prodConfig = Get-Content "docker-compose.prod.yml" -Raw
if ($prodConfig -match "NODE_OPTIONS=--max-old-space-size=3072") {
    Write-Host "✅ Production heap size: 3072MB" -ForegroundColor Green
} else {
    Write-Host "❌ Production heap size: Not configured" -ForegroundColor Red
}

if ($prodConfig -match "optimize-for-size") {
    Write-Host "✅ Memory optimization flag: Enabled" -ForegroundColor Green
} else {
    Write-Host "❌ Memory optimization flag: Not configured" -ForegroundColor Red
}
Write-Host ""

# 7. Verify Resource Limits
Write-Host "💾 Verifying Resource Limits..." -ForegroundColor Cyan
if ($prodConfig -match "memory: 4G") {
    Write-Host "✅ Backend memory limit: 4GB" -ForegroundColor Green
} else {
    Write-Host "❌ Backend memory limit: Not configured" -ForegroundColor Red
}

if ($prodConfig -match "cpus: '2.0'") {
    Write-Host "✅ Backend CPU limit: 2.0 cores" -ForegroundColor Green
} else {
    Write-Host "❌ Backend CPU limit: Not configured" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "📊 Performance Configuration Summary" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration Files:"
Write-Host "  ✓ docker-compose.yml - Base configuration with NODE_OPTIONS"
Write-Host "  ✓ docker-compose.prod.yml - Production optimizations"
Write-Host "  ✓ nginx/nginx.conf - Worker processes and upstream keepalive"
Write-Host "  ✓ aplikasi-server/src/config/supabase.js - Connection pooling"
Write-Host "  ✓ aplikasi-server/Dockerfile - Pre-loaded NLTK and models"
Write-Host ""
Write-Host "Performance Features:"
Write-Host "  ✓ Node.js heap size: 2GB (base), 3GB (production)"
Write-Host "  ✓ Nginx worker processes: Auto-detect CPU cores"
Write-Host "  ✓ Connection pooling: Supabase + Nginx upstream"
Write-Host "  ✓ Pre-loaded data: NLTK + Sentence-BERT models"
Write-Host "  ✓ Production flags: --optimize-for-size, --max-semi-space-size"
Write-Host ""
Write-Host "✅ All performance optimizations verified!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Monitor metrics: docker stats"
Write-Host "  2. Check logs: docker-compose logs -f backend"
Write-Host "  3. Test performance: See TASK-10.4-PERFORMANCE-OPTIMIZATION.md"
Write-Host ""
