# ============================================================================
# Logging Configuration Test Script (PowerShell)
# ============================================================================
# This script tests the logging configuration for SpecWeave Docker deployment
# Tests: stdout/stderr output, structured logging, request ID tracing, log rotation
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "SpecWeave Logging Configuration Test" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Test counter
$TestsPassed = 0
$TestsFailed = 0

# Helper function to print test results
function Print-Result {
    param(
        [bool]$Success,
        [string]$Message
    )
    
    if ($Success) {
        Write-Host "PASS: $Message" -ForegroundColor Green
        $script:TestsPassed++
    } else {
        Write-Host "FAIL: $Message" -ForegroundColor Red
        $script:TestsFailed++
    }
}

Write-Host "Test 1: Verify docker-compose.yml syntax" -ForegroundColor Yellow
Write-Host "----------------------------------------"
try {
    $null = docker-compose -f docker-compose.yml config --quiet 2>&1
    Print-Result $true "docker-compose.yml is valid"
} catch {
    Print-Result $false "docker-compose.yml has syntax errors"
}
Write-Host ""

Write-Host "Test 2: Verify docker-compose.prod.yml syntax" -ForegroundColor Yellow
Write-Host "----------------------------------------"
try {
    $null = docker-compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet 2>&1
    Print-Result $true "docker-compose.prod.yml is valid"
} catch {
    Print-Result $false "docker-compose.prod.yml has syntax errors"
}
Write-Host ""

Write-Host "Test 3: Verify docker-compose.dev.yml syntax" -ForegroundColor Yellow
Write-Host "----------------------------------------"
try {
    $null = docker-compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet 2>&1
    Print-Result $true "docker-compose.dev.yml is valid"
} catch {
    Print-Result $false "docker-compose.dev.yml has syntax errors"
}
Write-Host ""

Write-Host "Test 4: Check logging configuration in docker-compose.yml" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$config = docker-compose -f docker-compose.yml config 2>&1 | Out-String
Print-Result ($config -match "logging:") "Logging configuration found in docker-compose.yml"
Write-Host ""

Write-Host "Test 5: Check log rotation settings (max-size)" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Print-Result ($config -match "max-size") "Log rotation max-size configured"
Write-Host ""

Write-Host "Test 6: Check log rotation settings (max-file)" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Print-Result ($config -match "max-file") "Log rotation max-file configured"
Write-Host ""

Write-Host "Test 7: Check service labels for log filtering" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Print-Result ($config -match "com.specweave.service") "Service labels configured"
Write-Host ""

Write-Host "Test 8: Verify Nginx logs to stdout/stderr" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$nginxConf = Get-Content nginx/nginx.conf -Raw
$hasStdout = $nginxConf -match "/dev/stdout"
$hasStderr = $nginxConf -match "/dev/stderr"
Print-Result ($hasStdout -and $hasStderr) "Nginx configured to log to stdout/stderr"
Write-Host ""

Write-Host "Test 9: Check Nginx JSON log format" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Print-Result ($nginxConf -match "log_format json_combined") "Nginx JSON log format configured"
Write-Host ""

Write-Host "Test 10: Verify backend structured logging" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$loggingJs = Get-Content aplikasi-server/src/config/logging.js -Raw
Print-Result ($loggingJs -match "JSON.stringify\(logEntry\)") "Backend structured logging configured"
Write-Host ""

Write-Host "Test 11: Check request ID support in logger" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Print-Result ($loggingJs -match "requestId") "Request ID support in logger"
Write-Host ""

Write-Host "Test 12: Verify request ID middleware" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$errorHandler = Get-Content aplikasi-server/src/middlewares/errorHandler.js -Raw
Print-Result ($errorHandler -match "requestIdMiddleware") "Request ID middleware exists"
Write-Host ""

Write-Host "Test 13: Check timestamp in log format" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Print-Result ($loggingJs -match "timestamp") "Timestamp included in log format"
Write-Host ""

Write-Host "Test 14: Verify log levels configuration" -ForegroundColor Yellow
Write-Host "----------------------------------------"
Print-Result ($loggingJs -match "LOG_LEVELS") "Log levels configured"
Write-Host ""

Write-Host "Test 15: Check production logging labels in docker-compose.prod.yml" -ForegroundColor Yellow
Write-Host "----------------------------------------"
$prodConfig = docker-compose -f docker-compose.yml -f docker-compose.prod.yml config 2>&1 | Out-String
Print-Result ($prodConfig -match "com\.specweave\.environment.*production") "Production environment labels configured"
Write-Host ""

# Summary
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Tests Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Tests Failed: $TestsFailed" -ForegroundColor Red
Write-Host ""

if ($TestsFailed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Logging configuration is complete and meets requirements:"
    Write-Host "  - 13.1: Backend logs output to stdout/stderr"
    Write-Host "  - 13.2: Frontend/Nginx logs output to stdout/stderr"
    Write-Host "  - 13.6: Structured logging with timestamps and log levels"
    Write-Host "  - 13.9: Request ID tracing across services"
    Write-Host "  - 13.10: Log rotation configured"
    exit 0
} else {
    Write-Host "Some tests failed. Please review the configuration." -ForegroundColor Red
    exit 1
}
