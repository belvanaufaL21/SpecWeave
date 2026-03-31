#!/bin/bash

# ============================================================================
# SpecWeave Docker Health Check Script
# ============================================================================
# This script checks the health status of all SpecWeave Docker services.
# 
# Usage:
#   ./scripts/health-check.sh
#
# Requirements: 5.6, 5.9, 12.7
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status indicators
CHECK_MARK="${GREEN}✓${NC}"
CROSS_MARK="${RED}✗${NC}"
WARNING_MARK="${YELLOW}⚠${NC}"

# Configuration
BACKEND_URL="http://localhost:5003"
FRONTEND_URL="http://localhost:3000"
NETWORK_NAME="specweave-network"
EXPECTED_VOLUMES=("specweave-backend-logs" "specweave-nltk-data" "specweave-torch-models")

# Function to print section headers
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check container status
check_container_status() {
    local container_name=$1
    local status=$(docker ps -a --filter "name=$container_name" --format "{{.Status}}" 2>/dev/null)
    
    if [ -z "$status" ]; then
        echo -e "  ${CROSS_MARK} $container_name: ${RED}NOT FOUND${NC}"
        return 1
    elif [[ "$status" =~ ^Up ]]; then
        echo -e "  ${CHECK_MARK} $container_name: ${GREEN}RUNNING${NC} ($status)"
        return 0
    else
        echo -e "  ${CROSS_MARK} $container_name: ${RED}STOPPED${NC} ($status)"
        return 1
    fi
}

# Function to check backend health endpoint
check_backend_health() {
    local url="$BACKEND_URL/api/health"
    
    if command -v curl > /dev/null 2>&1; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ]; then
            echo -e "  ${CHECK_MARK} Backend Health Endpoint: ${GREEN}HEALTHY${NC} (HTTP $response)"
            
            # Try to get detailed health info
            local health_data=$(curl -s --max-time 5 "$url" 2>/dev/null || echo "{}")
            if [ -n "$health_data" ] && [ "$health_data" != "{}" ]; then
                echo "      Response: $health_data"
            fi
            return 0
        elif [ "$response" = "000" ]; then
            echo -e "  ${CROSS_MARK} Backend Health Endpoint: ${RED}UNREACHABLE${NC} (Connection failed)"
            return 1
        else
            echo -e "  ${CROSS_MARK} Backend Health Endpoint: ${RED}UNHEALTHY${NC} (HTTP $response)"
            return 1
        fi
    else
        echo -e "  ${WARNING_MARK} Backend Health Endpoint: ${YELLOW}SKIPPED${NC} (curl not installed)"
        return 2
    fi
}

# Function to check frontend accessibility
check_frontend_accessibility() {
    local url="$FRONTEND_URL"
    
    if command -v curl > /dev/null 2>&1; then
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "304" ]; then
            echo -e "  ${CHECK_MARK} Frontend Accessibility: ${GREEN}ACCESSIBLE${NC} (HTTP $response)"
            return 0
        elif [ "$response" = "000" ]; then
            echo -e "  ${CROSS_MARK} Frontend Accessibility: ${RED}UNREACHABLE${NC} (Connection failed)"
            return 1
        else
            echo -e "  ${CROSS_MARK} Frontend Accessibility: ${RED}INACCESSIBLE${NC} (HTTP $response)"
            return 1
        fi
    else
        echo -e "  ${WARNING_MARK} Frontend Accessibility: ${YELLOW}SKIPPED${NC} (curl not installed)"
        return 2
    fi
}

# Function to check volume existence
check_volume() {
    local volume_name=$1
    
    if docker volume inspect "$volume_name" > /dev/null 2>&1; then
        # Get volume size if possible
        local size=$(docker system df -v 2>/dev/null | grep "$volume_name" | awk '{print $3}' || echo "unknown")
        echo -e "  ${CHECK_MARK} $volume_name: ${GREEN}EXISTS${NC} (Size: $size)"
        return 0
    else
        echo -e "  ${CROSS_MARK} $volume_name: ${RED}NOT FOUND${NC}"
        return 1
    fi
}

# Function to check network existence
check_network() {
    local network_name=$1
    
    if docker network inspect "$network_name" > /dev/null 2>&1; then
        local driver=$(docker network inspect "$network_name" --format "{{.Driver}}" 2>/dev/null)
        echo -e "  ${CHECK_MARK} $network_name: ${GREEN}EXISTS${NC} (Driver: $driver)"
        return 0
    else
        echo -e "  ${CROSS_MARK} $network_name: ${RED}NOT FOUND${NC}"
        return 1
    fi
}

# Main health check execution
main() {
    local overall_status=0
    
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         SpecWeave Docker Health Check Report              ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo -e "  Timestamp: $(date)"
    
    # Check Docker daemon
    print_header "Docker Daemon Status"
    if docker info > /dev/null 2>&1; then
        echo -e "  ${CHECK_MARK} Docker Daemon: ${GREEN}RUNNING${NC}"
    else
        echo -e "  ${CROSS_MARK} Docker Daemon: ${RED}NOT RUNNING${NC}"
        echo ""
        echo -e "${RED}ERROR: Docker daemon is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    # Check container status
    print_header "Container Status"
    check_container_status "specweave-backend" || overall_status=1
    check_container_status "specweave-frontend" || overall_status=1
    
    # Check if nginx proxy is running (production mode)
    if docker ps --filter "name=specweave-nginx" --format "{{.Names}}" | grep -q "specweave-nginx"; then
        check_container_status "specweave-nginx" || overall_status=1
    fi
    
    # Check backend health endpoint
    print_header "Service Health Checks"
    check_backend_health || overall_status=1
    check_frontend_accessibility || overall_status=1
    
    # Check volumes
    print_header "Volume Status"
    for volume in "${EXPECTED_VOLUMES[@]}"; do
        check_volume "$volume" || overall_status=1
    done
    
    # Check network
    print_header "Network Status"
    check_network "$NETWORK_NAME" || overall_status=1
    
    # Overall status summary
    print_header "Overall Status"
    if [ $overall_status -eq 0 ]; then
        echo -e "  ${CHECK_MARK} System Status: ${GREEN}FULLY OPERATIONAL${NC}"
        echo ""
        echo -e "${GREEN}All health checks passed successfully!${NC}"
    else
        echo -e "  ${CROSS_MARK} System Status: ${RED}DEGRADED${NC}"
        echo ""
        echo -e "${RED}Some health checks failed. Please review the report above.${NC}"
        echo ""
        echo "Troubleshooting tips:"
        echo "  - Check container logs: docker-compose logs [service-name]"
        echo "  - Restart services: docker-compose restart"
        echo "  - Rebuild containers: docker-compose up --build"
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    exit $overall_status
}

# Run main function
main
