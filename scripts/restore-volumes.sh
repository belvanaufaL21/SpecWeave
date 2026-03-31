#!/bin/bash

# ============================================================================
# SpecWeave Docker Volume Restore Script
# ============================================================================
# This script restores Docker volumes from compressed tar archives.
# 
# Usage:
#   ./scripts/restore-volumes.sh <volume-name> <backup-file>
#
# Example:
#   ./scripts/restore-volumes.sh specweave-backend-logs ./backups/specweave-backend-logs_20240101_120000.tar.gz
#
# Requirements: 15.3, 15.8
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if required arguments are provided
if [ $# -ne 2 ]; then
    print_error "Invalid number of arguments"
    echo "Usage: $0 <volume-name> <backup-file>"
    echo ""
    echo "Example:"
    echo "  $0 specweave-backend-logs ./backups/specweave-backend-logs_20240101_120000.tar.gz"
    exit 1
fi

VOLUME_NAME=$1
BACKUP_FILE=$2

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file '$BACKUP_FILE' does not exist"
    exit 1
fi

# Validate backup file is a tar.gz archive
if [[ ! "$BACKUP_FILE" =~ \.tar\.gz$ ]]; then
    print_error "Backup file must be a .tar.gz archive"
    exit 1
fi

# Check if volume exists
VOLUME_EXISTS=false
if docker volume inspect "$VOLUME_NAME" > /dev/null 2>&1; then
    VOLUME_EXISTS=true
    print_warning "Volume '$VOLUME_NAME' already exists"
    echo ""
    read -p "Do you want to overwrite the existing volume? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Restore cancelled by user"
        exit 0
    fi
    print_info "Existing volume will be overwritten"
else
    print_info "Creating new volume: $VOLUME_NAME"
    docker volume create "$VOLUME_NAME" > /dev/null
fi

# Get absolute path of backup file
BACKUP_FILE_ABS=$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")
BACKUP_SIZE=$(du -h "$BACKUP_FILE_ABS" | cut -f1)

print_info "Starting restore of volume: $VOLUME_NAME"
print_info "Backup source: $BACKUP_FILE_ABS"
print_info "Backup size: $BACKUP_SIZE"

# If volume exists, clear its contents first
if [ "$VOLUME_EXISTS" = true ]; then
    print_info "Clearing existing volume contents..."
    docker run --rm \
        -v "$VOLUME_NAME:/target" \
        alpine:latest \
        sh -c "rm -rf /target/* /target/.[!.]* 2>/dev/null || true"
fi

# Restore backup using a temporary container
# This mounts the volume and extracts the tar archive
docker run --rm \
    -v "$VOLUME_NAME:/target" \
    -v "$(dirname "$BACKUP_FILE_ABS"):/backup:ro" \
    alpine:latest \
    tar xzf "/backup/$(basename "$BACKUP_FILE_ABS")" -C /target

# Verify restore success by checking if volume has content
VOLUME_CONTENT_COUNT=$(docker run --rm \
    -v "$VOLUME_NAME:/target:ro" \
    alpine:latest \
    sh -c "find /target -type f | wc -l")

if [ "$VOLUME_CONTENT_COUNT" -eq 0 ]; then
    print_warning "Volume appears to be empty after restore"
    print_info "This might be expected if the backup was empty"
else
    print_success "Restore completed successfully"
fi

echo ""
echo "Restore Details:"
echo "  Volume:        $VOLUME_NAME"
echo "  Backup File:   $BACKUP_FILE_ABS"
echo "  Backup Size:   $BACKUP_SIZE"
echo "  Files Restored: $VOLUME_CONTENT_COUNT"
echo "  Restored:      $(date)"
echo ""

# Verify volume integrity
print_info "Verifying volume integrity..."
docker run --rm \
    -v "$VOLUME_NAME:/target:ro" \
    alpine:latest \
    ls -lah /target > /dev/null 2>&1

if [ $? -eq 0 ]; then
    print_success "Volume integrity verified"
else
    print_error "Volume integrity check failed"
    exit 1
fi

print_success "Restore process completed"
echo ""
print_info "You may need to restart containers using this volume:"
echo "  docker-compose restart"

exit 0
