# SpecWeave Docker Maintenance Scripts

This directory contains helper scripts for maintaining and monitoring the SpecWeave Docker deployment.

## Prerequisites

- Docker and Docker Compose installed
- Bash shell (Linux/Mac) or Git Bash/WSL (Windows)
- `curl` command-line tool (for health checks and wait scripts)

## Scripts Overview

### 1. backup-volumes.sh

Creates compressed tar archives of Docker volumes for backup purposes.

**Usage:**
```bash
./scripts/backup-volumes.sh <volume-name> <backup-directory>
```

**Example:**
```bash
# Backup backend logs
./scripts/backup-volumes.sh specweave-backend-logs ./backups

# Backup NLTK data
./scripts/backup-volumes.sh specweave-nltk-data ./backups

# Backup PyTorch models
./scripts/backup-volumes.sh specweave-torch-models ./backups
```

**Features:**
- Validates volume exists before backup
- Creates backup directory if it doesn't exist
- Generates timestamped backup filenames
- Shows backup file size and location
- Can be scheduled with cron for automated backups

**Requirements:** 15.1, 15.2, 15.7

---

### 2. restore-volumes.sh

Restores Docker volumes from compressed tar archives.

**Usage:**
```bash
./scripts/restore-volumes.sh <volume-name> <backup-file>
```

**Example:**
```bash
# Restore backend logs from backup
./scripts/restore-volumes.sh specweave-backend-logs ./backups/specweave-backend-logs_20240101_120000.tar.gz
```

**Features:**
- Validates backup file exists
- Prompts for confirmation before overwriting existing volumes
- Creates new volume if it doesn't exist
- Verifies restore success
- Shows number of files restored

**Requirements:** 15.3, 15.8

---

### 3. health-check.sh

Comprehensive health check for all SpecWeave Docker services.

**Usage:**
```bash
./scripts/health-check.sh
```

**Features:**
- Checks Docker daemon status
- Verifies all containers are running
- Tests backend health endpoint (`/api/health`)
- Tests frontend accessibility
- Verifies all volumes exist
- Verifies network exists
- Color-coded status indicators (✓ green, ✗ red, ⚠ yellow)
- Overall system status summary

**Exit Codes:**
- `0`: All checks passed (system fully operational)
- `1`: Some checks failed (system degraded)

**Requirements:** 5.6, 5.9, 12.7

---

### 4. wait-for-services.sh

Waits for SpecWeave services to become ready. Useful for CI/CD pipelines and automated deployments.

**Usage:**
```bash
./scripts/wait-for-services.sh [options]
```

**Options:**
- `--backend-url URL`: Backend URL (default: http://localhost:5003)
- `--frontend-url URL`: Frontend URL (default: http://localhost:3000)
- `--max-retries NUM`: Maximum retry attempts (default: 30)
- `--retry-interval SEC`: Seconds between retries (default: 5)
- `--timeout SEC`: Total timeout in seconds (default: 300)

**Example:**
```bash
# Wait with default settings
./scripts/wait-for-services.sh

# Wait with custom retry settings
./scripts/wait-for-services.sh --max-retries 60 --retry-interval 3

# Wait for custom URLs
./scripts/wait-for-services.sh --backend-url http://backend:5003 --frontend-url http://frontend:3000
```

**Features:**
- Waits for backend health endpoint to return 200
- Waits for frontend to become accessible
- Configurable retry attempts and intervals
- Total timeout protection
- Progress messages during wait
- Troubleshooting tips on failure

**Exit Codes:**
- `0`: All services ready
- `1`: Services did not become ready within timeout

**Requirements:** 5.1, 5.2, 12.7

---

## Common Workflows

### Daily Backup Routine

```bash
#!/bin/bash
# Create daily backups of all volumes

BACKUP_DIR="./backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

./scripts/backup-volumes.sh specweave-backend-logs "$BACKUP_DIR"
./scripts/backup-volumes.sh specweave-nltk-data "$BACKUP_DIR"
./scripts/backup-volumes.sh specweave-torch-models "$BACKUP_DIR"

echo "Daily backup completed: $BACKUP_DIR"
```

### Automated Backup with Cron

Add to crontab (`crontab -e`):

```cron
# Daily backup at 2 AM
0 2 * * * cd /path/to/specweave && ./scripts/backup-volumes.sh specweave-backend-logs ./backups

# Weekly backup of all volumes on Sunday at 3 AM
0 3 * * 0 cd /path/to/specweave && ./scripts/backup-all-volumes.sh
```

### CI/CD Deployment Verification

```bash
#!/bin/bash
# Deploy and verify services are ready

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for services to be ready
./scripts/wait-for-services.sh --timeout 600

# Run health check
./scripts/health-check.sh

if [ $? -eq 0 ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed health check"
    exit 1
fi
```

### Disaster Recovery

```bash
#!/bin/bash
# Restore from backup

# Stop services
docker-compose down

# Restore volumes
./scripts/restore-volumes.sh specweave-backend-logs ./backups/specweave-backend-logs_20240101_120000.tar.gz
./scripts/restore-volumes.sh specweave-nltk-data ./backups/specweave-nltk-data_20240101_120000.tar.gz
./scripts/restore-volumes.sh specweave-torch-models ./backups/specweave-torch-models_20240101_120000.tar.gz

# Start services
docker-compose up -d

# Verify services are healthy
./scripts/wait-for-services.sh
./scripts/health-check.sh
```

### Pre-Deployment Health Check

```bash
#!/bin/bash
# Check system health before deploying updates

./scripts/health-check.sh

if [ $? -eq 0 ]; then
    echo "System healthy, proceeding with deployment..."
    # Perform deployment
else
    echo "System unhealthy, aborting deployment"
    exit 1
fi
```

---

## Troubleshooting

### Scripts Not Executable

On Linux/Mac, make scripts executable:
```bash
chmod +x scripts/*.sh
```

On Windows, use Git Bash or WSL to run the scripts.

### curl Not Found

Install curl:
- **Ubuntu/Debian**: `sudo apt-get install curl`
- **CentOS/RHEL**: `sudo yum install curl`
- **macOS**: `brew install curl`
- **Windows**: Use Git Bash (includes curl) or install from https://curl.se/

### Permission Denied on Volume Operations

Ensure Docker daemon is running and you have proper permissions:
```bash
# Check Docker status
docker info

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
```

### Backup/Restore Fails

- Verify volume exists: `docker volume ls`
- Check disk space: `df -h`
- Verify backup file integrity: `tar -tzf backup-file.tar.gz`

---

## Notes

- All scripts include colored output for better readability
- Scripts follow bash best practices for portability
- Exit codes follow standard conventions (0 = success, 1 = failure)
- Scripts include comprehensive error handling and validation
- Progress messages help track long-running operations
- Scripts are safe to run in production environments

---

## Related Documentation

- [Docker Deployment Guide](../README-DOCKER.md)
- [Requirements Document](../.kiro/specs/docker-deployment-setup/requirements.md)
- [Design Document](../.kiro/specs/docker-deployment-setup/design.md)
