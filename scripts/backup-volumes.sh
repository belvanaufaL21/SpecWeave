#!/bin/bash

# ============================================================================
# SpecWeave Docker Volume Backup Script
# ============================================================================
# This script creates compressed tar archives of Docker volumes for backup.
# 
# Usage:
#   ./scripts/backup-volumes.sh <volume-name> <backup-directory>
#
# Example:
#   ./scripts/backup-volumes.sh specweave-backend-logs ./backups
#
# Requirements: 15.1, 15.2, 15.7
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

# Check if required arguments are provided
if [ $# -ne 2 ]; then
    print_error "Invalid number of arguments"
    echo "Usage: $0 <volume-name> <backup-directory>"
    echo ""
    echo "Example:"
    echo "  $0 specweave-backend-logs ./backups"
    echo ""
    echo "Available volumes:"
    docker volume ls --format "{{.Name}}" | grep specweave || echo "  No SpecWeave volumes found"
    exit 1
fi

VOLUME_NAME=$1
BACKUP_DIR=$2

# Validate volume exists
if ! docker volume inspect "$VOLUME_NAME" > /dev/null 2>&1; then
    print_error "Volume '$VOLUME_NAME' does not exist"
    echo ""
    echo "Available volumes:"
    docker volume ls --format "{{.Name}}" | grep specweave || echo "  No SpecWeave volumes found"
    exit 1
fi

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    print_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${VOLUME_NAME}_${TIMESTAMP}.tar.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

print_info "Starting backup of volume: $VOLUME_NAME"
print_info "Backup destination: $BACKUP_PATH"

# Create backup using a temporary container
# This mounts the volume and creates a compressed tar archive
docker run --rm \
    -v "$VOLUME_NAME:/source:ro" \
    -v "$(cd "$BACKUP_DIR" && pwd):/backup" \
    alpine:latest \
    tar czf "/backup/$BACKUP_FILENAME" -C /source .

# Check if backup was created successfully
if [ ! -f "$BACKUP_PATH" ]; then
    print_error "Backup file was not created"
    exit 1
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

print_success "Backup completed successfully"
echo ""
echo "Backup Details:"
echo "  Volume:   $VOLUME_NAME"
echo "  File:     $BACKUP_PATH"
echo "  Size:     $BACKUP_SIZE"
echo "  Created:  $(date)"
echo ""
print_info "To restore this backup, use: ./scripts/restore-volumes.sh $VOLUME_NAME $BACKUP_PATH"

exit 0
