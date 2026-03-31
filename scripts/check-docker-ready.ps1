# ============================================================================
# Docker Readiness Check Script for SpecWeave
# ============================================================================
# This script checks if Docker Desktop is installed and properly configured
# for running SpecWeave Docker deployment.
#
# Usage: .\scripts\check-docker-ready.ps1
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"

# Color codes
$GREEN = "Green"
$RED = "Red"
$YELLOW = "Yellow"
$BLUE = "Cyan"

# Status indicators
$CHECK_MARK = "[OK]"
$CROSS_MARK = "[FAIL]"
$WARNING_MARK = "[WARN]"
$INFO_MARK = "[INFO]"

Write-Host ""
Write-Host "============================================================" -ForegroundColor $BLUE
Write-Host "  SpecWeave Docker Readiness Check" -ForegroundColor $BLUE
Write-Host "============================================================" -ForegroundColor $BLUE
Write-Host ""

$allChecksPassed = $true

# ============================================================================
# Check 1: Docker Command Available
# ============================================================================
Write-Host "Checking Docker installation..." -ForegroundColor $BLUE

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerCmd) {
    Write-Host "$CHECK_MARK Docker command found" -ForegroundColor $GREEN
    
    # Get Docker version
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "    Version: $dockerVersion" -ForegroundColor $GREEN
    }
} else {
    Write-Host "$CROSS_MARK Docker command not found" -ForegroundColor $RED
    Write-Host "    Docker Desktop is not installed or not in PATH" -ForegroundColor $RED
    Write-Host "    Please install Docker Desktop from:" -ForegroundColor $YELLOW
    Write-Host "    https://www.docker.com/products/docker-desktop/" -ForegroundColor $YELLOW
    Write-Host ""
    Write-Host "    See: .kiro/specs/docker-deployment-setup/DOCKER-INSTALLATION-GUIDE.md" -ForegroundColor $YELLOW
    $allChecksPassed = $false
}

# ============================================================================
# Check 2: Docker Daemon Running
# ============================================================================
Write-Host ""
Write-Host "Checking Docker daemon status..." -ForegroundColor $BLUE

if ($dockerCmd) {
    $dockerInfo = docker info 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$CHECK_MARK Docker daemon is running" -ForegroundColor $GREEN
    } else {
        Write-Host "$CROSS_MARK Docker daemon is not running" -ForegroundColor $RED
        Write-Host "    Please start Docker Desktop" -ForegroundColor $YELLOW
        Write-Host "    Look for the whale icon in system tray" -ForegroundColor $YELLOW
        $allChecksPassed = $false
    }
}

# ============================================================================
# Check 3: Docker Compose Available
# ============================================================================
Write-Host ""
Write-Host "Checking Docker Compose..." -ForegroundColor $BLUE

$composeCmd = Get-Command docker-compose -ErrorAction SilentlyContinue

if ($composeCmd) {
    Write-Host "$CHECK_MARK Docker Compose command found" -ForegroundColor $GREEN
    
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Host "    Version: $composeVersion" -ForegroundColor $GREEN
    }
} else {
    # Check for docker compose (V2 - no hyphen)
    $composeV2 = docker compose version 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$CHECK_MARK Docker Compose V2 available" -ForegroundColor $GREEN
        Write-Host "    Version: $composeV2" -ForegroundColor $GREEN
    } else {
        Write-Host "$CROSS_MARK Docker Compose not found" -ForegroundColor $RED
        Write-Host "    Docker Compose should be included with Docker Desktop" -ForegroundColor $YELLOW
        $allChecksPassed = $false
    }
}

# ============================================================================
# Check 4: WSL 2 (Windows Subsystem for Linux)
# ============================================================================
Write-Host ""
Write-Host "Checking WSL 2 status..." -ForegroundColor $BLUE

$wslVersion = wsl --status 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "$CHECK_MARK WSL is installed" -ForegroundColor $GREEN
    
    # Check if WSL 2 is default
    $wslDefaultVersion = wsl -l -v 2>$null | Select-String "Version 2"
    
    if ($wslDefaultVersion) {
        Write-Host "$CHECK_MARK WSL 2 is available" -ForegroundColor $GREEN
    } else {
        Write-Host "$WARNING_MARK WSL 2 may not be set as default" -ForegroundColor $YELLOW
        Write-Host "    Run: wsl --set-default-version 2" -ForegroundColor $YELLOW
    }
} else {
    Write-Host "$WARNING_MARK WSL not detected" -ForegroundColor $YELLOW
    Write-Host "    Docker Desktop can use Hyper-V instead" -ForegroundColor $YELLOW
    Write-Host "    For better performance, consider enabling WSL 2" -ForegroundColor $YELLOW
}

# ============================================================================
# Check 5: Required Ports Available
# ============================================================================
Write-Host ""
Write-Host "Checking required ports..." -ForegroundColor $BLUE

$requiredPorts = @(3000, 5003, 80)
$portsAvailable = $true

foreach ($port in $requiredPorts) {
    $portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($portInUse) {
        Write-Host "$WARNING_MARK Port $port is in use" -ForegroundColor $YELLOW
        $process = Get-Process -Id $portInUse.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "    Used by: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor $YELLOW
        }
        $portsAvailable = $false
    } else {
        Write-Host "$CHECK_MARK Port $port is available" -ForegroundColor $GREEN
    }
}

if (-not $portsAvailable) {
    Write-Host ""
    Write-Host "    Note: Ports will be needed when starting Docker containers" -ForegroundColor $YELLOW
    Write-Host "    Stop conflicting services before running docker-compose up" -ForegroundColor $YELLOW
}

# ============================================================================
# Check 6: Environment File
# ============================================================================
Write-Host ""
Write-Host "Checking environment configuration..." -ForegroundColor $BLUE

if (Test-Path ".env") {
    Write-Host "$CHECK_MARK .env file exists" -ForegroundColor $GREEN
    
    # Check for required variables
    $envContent = Get-Content ".env" -Raw
    $requiredVars = @(
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_ANON_KEY",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GROQ_API_KEY"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch "$var=.+") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Write-Host "$CHECK_MARK All required environment variables present" -ForegroundColor $GREEN
    } else {
        Write-Host "$WARNING_MARK Some environment variables may be missing:" -ForegroundColor $YELLOW
        foreach ($var in $missingVars) {
            Write-Host "    - $var" -ForegroundColor $YELLOW
        }
        Write-Host "    Check .env.example for reference" -ForegroundColor $YELLOW
    }
} else {
    Write-Host "$WARNING_MARK .env file not found" -ForegroundColor $YELLOW
    Write-Host "    Copy .env.example to .env and configure it" -ForegroundColor $YELLOW
    Write-Host "    Command: Copy-Item .env.example .env" -ForegroundColor $YELLOW
}

# ============================================================================
# Check 7: Docker Configuration Files
# ============================================================================
Write-Host ""
Write-Host "Checking Docker configuration files..." -ForegroundColor $BLUE

$dockerFiles = @(
    "docker-compose.yml",
    "docker-compose.dev.yml",
    "docker-compose.prod.yml",
    "aplikasi-klien/Dockerfile",
    "aplikasi-klien/Dockerfile.dev",
    "aplikasi-server/Dockerfile",
    "aplikasi-server/Dockerfile.dev"
)

$allFilesExist = $true
foreach ($file in $dockerFiles) {
    if (Test-Path $file) {
        Write-Host "$CHECK_MARK $file" -ForegroundColor $GREEN
    } else {
        Write-Host "$CROSS_MARK $file missing" -ForegroundColor $RED
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "    Some Docker configuration files are missing" -ForegroundColor $RED
    Write-Host "    Ensure tasks 1-6 are completed" -ForegroundColor $YELLOW
    $allChecksPassed = $false
}

# ============================================================================
# Check 8: Disk Space
# ============================================================================
Write-Host ""
Write-Host "Checking disk space..." -ForegroundColor $BLUE

$drive = Get-PSDrive -Name C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)

if ($freeSpaceGB -gt 60) {
    Write-Host "$CHECK_MARK Sufficient disk space: $freeSpaceGB GB free" -ForegroundColor $GREEN
} elseif ($freeSpaceGB -gt 30) {
    Write-Host "$WARNING_MARK Limited disk space: $freeSpaceGB GB free" -ForegroundColor $YELLOW
    Write-Host "    Recommended: 60GB+ for Docker images and volumes" -ForegroundColor $YELLOW
} else {
    Write-Host "$CROSS_MARK Low disk space: $freeSpaceGB GB free" -ForegroundColor $RED
    Write-Host "    Docker requires significant disk space" -ForegroundColor $RED
    Write-Host "    Free up space before building images" -ForegroundColor $YELLOW
    $allChecksPassed = $false
}

# ============================================================================
# Check 9: Memory
# ============================================================================
Write-Host ""
Write-Host "Checking system memory..." -ForegroundColor $BLUE

$totalMemoryGB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)

if ($totalMemoryGB -ge 8) {
    Write-Host "$CHECK_MARK Sufficient memory: $totalMemoryGB GB total" -ForegroundColor $GREEN
} elseif ($totalMemoryGB -ge 4) {
    Write-Host "$WARNING_MARK Limited memory: $totalMemoryGB GB total" -ForegroundColor $YELLOW
    Write-Host "    Recommended: 8GB+ for optimal performance" -ForegroundColor $YELLOW
} else {
    Write-Host "$CROSS_MARK Insufficient memory: $totalMemoryGB GB total" -ForegroundColor $RED
    Write-Host "    SpecWeave requires at least 4GB RAM" -ForegroundColor $RED
    $allChecksPassed = $false
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor $BLUE
Write-Host "  Summary" -ForegroundColor $BLUE
Write-Host "============================================================" -ForegroundColor $BLUE
Write-Host ""

if ($allChecksPassed) {
    Write-Host "✓ All checks passed! You're ready to run checkpoint task 7" -ForegroundColor $GREEN
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor $BLUE
    Write-Host "  1. Review: .kiro/specs/docker-deployment-setup/QUICK-START.md" -ForegroundColor $BLUE
    Write-Host "  2. Build images: docker-compose -f docker-compose.yml -f docker-compose.dev.yml build" -ForegroundColor $BLUE
    Write-Host "  3. Start services: docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d" -ForegroundColor $BLUE
    Write-Host "  4. Verify: docker ps" -ForegroundColor $BLUE
    Write-Host ""
} else {
    Write-Host "✗ Some checks failed. Please address the issues above." -ForegroundColor $RED
    Write-Host ""
    Write-Host "Common solutions:" -ForegroundColor $YELLOW
    Write-Host "  - Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor $YELLOW
    Write-Host "  - Start Docker Desktop (check system tray for whale icon)" -ForegroundColor $YELLOW
    Write-Host "  - Configure .env file from .env.example" -ForegroundColor $YELLOW
    Write-Host "  - Free up disk space if needed" -ForegroundColor $YELLOW
    Write-Host ""
    Write-Host "For detailed help:" -ForegroundColor $YELLOW
    Write-Host "  See: .kiro/specs/docker-deployment-setup/DOCKER-INSTALLATION-GUIDE.md" -ForegroundColor $YELLOW
    Write-Host ""
}

Write-Host "============================================================" -ForegroundColor $BLUE
Write-Host ""

# Exit with appropriate code
if ($allChecksPassed) {
    exit 0
} else {
    exit 1
}
