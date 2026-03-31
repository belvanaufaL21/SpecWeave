# Docker Security Verification Script (PowerShell)
# Verifies Docker security best practices per requirements 11.1-11.9

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Docker Security Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$Passed = 0
$Failed = 0
$Warnings = 0

function Test-SecurityRequirement {
    param(
        [string]$Name,
        [bool]$Condition,
        [string]$SuccessMessage = "",
        [string]$FailureMessage = ""
    )
    
    if ($Condition) {
        Write-Host "✓ $Name" -ForegroundColor Green
        if ($SuccessMessage) { Write-Host "  $SuccessMessage" -ForegroundColor Gray }
        $script:Passed++
        return $true
    } else {
        Write-Host "✗ $Name" -ForegroundColor Red
        if ($FailureMessage) { Write-Host "  $FailureMessage" -ForegroundColor Gray }
        $script:Failed++
        return $false
    }
}

function Test-SecurityWarning {
    param(
        [string]$Name,
        [string]$Message = ""
    )
    
    Write-Host "⚠ $Name" -ForegroundColor Yellow
    if ($Message) { Write-Host "  $Message" -ForegroundColor Gray }
    $script:Warnings++
}

Write-Host "Requirement 11.1: Non-root user verification" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

$frontendRunning = docker ps --format "{{.Names}}" 2>$null | Select-String "specweave-frontend"
if ($frontendRunning) {
    $frontendUser = docker exec specweave-frontend whoami 2>$null
    Test-SecurityRequirement "Frontend runs as non-root user" ($frontendUser -eq "nginx") "User: nginx" "Expected nginx, got: $frontendUser"
} else {
    Test-SecurityWarning "Frontend container not running" "Start with: docker-compose up -d"
}

$backendRunning = docker ps --format "{{.Names}}" 2>$null | Select-String "specweave-backend"
if ($backendRunning) {
    $backendUser = docker exec specweave-backend whoami 2>$null
    Test-SecurityRequirement "Backend runs as non-root user" ($backendUser -eq "node") "User: node" "Expected node, got: $backendUser"
} else {
    Test-SecurityWarning "Backend container not running" "Start with: docker-compose up -d"
}

Write-Host ""
Write-Host "Requirement 11.2: Official base images" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

$frontendDockerfile = Get-Content "aplikasi-klien/Dockerfile" -Raw -ErrorAction SilentlyContinue
$hasNodeAlpine = $frontendDockerfile -match "FROM node:18-alpine"
$hasNginxAlpine = $frontendDockerfile -match "FROM nginx:alpine"
Test-SecurityRequirement "Frontend uses official images" ($hasNodeAlpine -and $hasNginxAlpine) "node:18-alpine, nginx:alpine" "Missing official images"

$backendDockerfile = Get-Content "aplikasi-server/Dockerfile" -Raw -ErrorAction SilentlyContinue
Test-SecurityRequirement "Backend uses official image" ($backendDockerfile -match "FROM node:18-bullseye") "node:18-bullseye" "Not using official image"

$prodCompose = Get-Content "docker-compose.prod.yml" -Raw -ErrorAction SilentlyContinue
Test-SecurityRequirement "Nginx proxy uses official image" ($prodCompose -match "image: nginx:alpine") "nginx:alpine" "Not using official image"

Write-Host ""
Write-Host "Requirement 11.3: Image scanning documentation" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

$securityDoc = Get-Content ".kiro/specs/docker-deployment-setup/DOCKER-SECURITY.md" -Raw -ErrorAction SilentlyContinue
Test-SecurityRequirement "Security documentation exists" ($securityDoc -match "Docker Image Scanning") "DOCKER-SECURITY.md found" "Documentation missing"

Test-SecurityRequirement "CI/CD scan example provided" (Test-Path ".github/workflows/docker-security-scan.yml.example") "Example workflow exists" "Example not found"

Write-Host ""
Write-Host "Requirement 11.4: Minimal attack surface" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

Test-SecurityRequirement "Frontend uses Alpine images" ($frontendDockerfile -match "alpine") "Smaller attack surface" "Not using Alpine"
Test-SecurityRequirement "Frontend multi-stage build" ($frontendDockerfile -match "AS builder") "Build optimization" "Not using multi-stage"
Test-SecurityRequirement "Backend cleans package cache" ($backendDockerfile -match "rm -rf /var/lib/apt/lists") "Cache cleaned" "Cache not cleaned"

Write-Host ""
Write-Host "Requirement 11.6: Secrets management" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

Test-SecurityRequirement ".env.example exists" (Test-Path ".env.example") "Template provided" "Template missing"

$gitignore = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
Test-SecurityRequirement ".env in .gitignore" ($gitignore -match "\.env") "Secrets protected" ".env not ignored"

$hasHardcodedSecrets = $false
Get-ChildItem -Path "aplikasi-*" -Filter "Dockerfile" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "password|secret.*key|token.*=") {
        $hasHardcodedSecrets = $true
    }
}
Test-SecurityRequirement "No hardcoded secrets" (-not $hasHardcodedSecrets) "Dockerfiles clean" "Found potential secrets"

Write-Host ""
Write-Host "Requirement 11.7: Security headers" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

$nginxConf = Get-Content "nginx/default.conf" -Raw -ErrorAction SilentlyContinue
$frontendNginx = Get-Content "aplikasi-klien/nginx.conf" -Raw -ErrorAction SilentlyContinue
$allNginxConf = $nginxConf + $frontendNginx

$hasXFrame = $allNginxConf -match "X-Frame-Options"
$hasXContent = $allNginxConf -match "X-Content-Type-Options"
$hasXSS = $allNginxConf -match "X-XSS-Protection"
$hasReferrer = $allNginxConf -match "Referrer-Policy"

Test-SecurityRequirement "Security headers configured" ($hasXFrame -and $hasXContent -and $hasXSS -and $hasReferrer) "All headers present" "Missing headers"

Write-Host ""
Write-Host "Requirement 11.8: Read-only filesystem" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

Test-SecurityRequirement "Read-only filesystem configured" ($prodCompose -match "read_only: true") "Production hardened" "Not configured"
Test-SecurityRequirement "Tmpfs mounts configured" ($prodCompose -match "tmpfs:") "Writable dirs isolated" "No tmpfs found"

Write-Host ""
Write-Host "Requirement 11.9: Network isolation" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

$baseCompose = Get-Content "docker-compose.yml" -Raw -ErrorAction SilentlyContinue
Test-SecurityRequirement "Custom network configured" ($baseCompose -match "specweave-network") "Bridge network defined" "No custom network"

$networkExists = docker network ls --format "{{.Name}}" 2>$null | Select-String "specweave-network"
if ($networkExists) {
    Test-SecurityRequirement "Network exists" $true "specweave-network active"
} else {
    Test-SecurityWarning "Network not created" "Run: docker-compose up -d"
}

Write-Host ""
Write-Host "Additional Security Checks" -ForegroundColor White
Write-Host "----------------------------------------------" -ForegroundColor Gray

Test-SecurityRequirement "Frontend ports not exposed in prod" ($prodCompose -match "ports: \[\]") "Only via proxy" "May be exposed"
Test-SecurityRequirement "Backend health check" ($backendDockerfile -match "HEALTHCHECK") "Monitoring enabled" "No health check"
Test-SecurityRequirement "Frontend health check" ($frontendDockerfile -match "HEALTHCHECK") "Monitoring enabled" "No health check"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed:   $Passed" -ForegroundColor Green
Write-Host "Warnings: $Warnings" -ForegroundColor Yellow
Write-Host "Failed:   $Failed" -ForegroundColor Red
Write-Host ""

if ($Failed -eq 0) {
    Write-Host "✓ All critical security requirements met!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ Some security requirements failed. Please review." -ForegroundColor Red
    exit 1
}
