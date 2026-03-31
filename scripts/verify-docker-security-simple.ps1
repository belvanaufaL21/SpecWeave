# Docker Security Verification Script
Write-Host "Docker Security Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

Write-Host "Checking security requirements..." -ForegroundColor White
Write-Host ""

# 11.1: Non-root users
Write-Host "[11.1] Non-root user configuration" -ForegroundColor Yellow
$backendDockerfile = Get-Content "aplikasi-server/Dockerfile" -Raw
if ($backendDockerfile -match "USER node") {
    Write-Host "  ✓ Backend uses non-root user (node)" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Backend missing non-root user" -ForegroundColor Red
    $failed++
}

$frontendDockerfile = Get-Content "aplikasi-klien/Dockerfile" -Raw
if ($frontendDockerfile -match "nginx:nginx") {
    Write-Host "  ✓ Frontend uses non-root user (nginx)" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Frontend missing non-root configuration" -ForegroundColor Red
    $failed++
}

# 11.2: Official images
Write-Host ""
Write-Host "[11.2] Official base images" -ForegroundColor Yellow
if ($frontendDockerfile -match "FROM node:18-alpine" -and $frontendDockerfile -match "FROM nginx:alpine") {
    Write-Host "  ✓ Frontend uses official images" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Frontend not using official images" -ForegroundColor Red
    $failed++
}

if ($backendDockerfile -match "FROM node:18-bullseye") {
    Write-Host "  ✓ Backend uses official image" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Backend not using official image" -ForegroundColor Red
    $failed++
}

# 11.3: Image scanning documentation
Write-Host ""
Write-Host "[11.3] Image scanning documentation" -ForegroundColor Yellow
if (Test-Path ".kiro/specs/docker-deployment-setup/DOCKER-SECURITY.md") {
    Write-Host "  ✓ Security documentation exists" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Security documentation missing" -ForegroundColor Red
    $failed++
}

if (Test-Path ".github/workflows/docker-security-scan.yml.example") {
    Write-Host "  ✓ CI/CD scan example provided" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ CI/CD example missing" -ForegroundColor Red
    $failed++
}

# 11.4: Minimal attack surface
Write-Host ""
Write-Host "[11.4] Minimal attack surface" -ForegroundColor Yellow
if ($frontendDockerfile -match "AS builder") {
    Write-Host "  ✓ Multi-stage build used" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Multi-stage build not used" -ForegroundColor Red
    $failed++
}

if ($backendDockerfile -match "rm -rf /var/lib/apt/lists") {
    Write-Host "  ✓ Package cache cleaned" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Package cache not cleaned" -ForegroundColor Red
    $failed++
}

# 11.7: Security headers
Write-Host ""
Write-Host "[11.7] Security headers" -ForegroundColor Yellow
$nginxConf = Get-Content "aplikasi-klien/nginx.conf" -Raw
if ($nginxConf -match "X-Frame-Options" -and $nginxConf -match "X-Content-Type-Options") {
    Write-Host "  ✓ Security headers configured" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Security headers missing" -ForegroundColor Red
    $failed++
}

# 11.8: Read-only filesystem
Write-Host ""
Write-Host "[11.8] Read-only filesystem" -ForegroundColor Yellow
$prodCompose = Get-Content "docker-compose.prod.yml" -Raw
if ($prodCompose -match "read_only: true") {
    Write-Host "  ✓ Read-only filesystem configured" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Read-only filesystem not configured" -ForegroundColor Red
    $failed++
}

if ($prodCompose -match "tmpfs:") {
    Write-Host "  ✓ Tmpfs mounts configured" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Tmpfs mounts missing" -ForegroundColor Red
    $failed++
}

# 11.9: Network isolation
Write-Host ""
Write-Host "[11.9] Network isolation" -ForegroundColor Yellow
$baseCompose = Get-Content "docker-compose.yml" -Raw
if ($baseCompose -match "specweave-network") {
    Write-Host "  ✓ Custom network configured" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  ✗ Custom network not configured" -ForegroundColor Red
    $failed++
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All security requirements met!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some requirements failed" -ForegroundColor Red
    exit 1
}
