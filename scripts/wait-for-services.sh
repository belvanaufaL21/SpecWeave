#!/bin/bash

# ============================================================================
# SpecWeave Docker Wait-for-Services Script
# ============================================================================
# This script waits for SpecWeave services to become ready before proceeding.
# Useful for CI/CD pipelines and automated deployments.
# 
# Usage:
#   ./scripts/wait-for-services.sh [options]
#
# Options:
#   --backend-url URL    Backend URL (default: http://localhost:5003)
#   --frontend-url URL   Frontend URL (default: http://localhost:3000)
#   --max-retries NUM    Maximum retry attempts (default: 30)
#   --retry-interval SEC Seconds between retries (default: 5)
#   --timeout SEC        Total timeout in seconds (default: 300)
#
# Example:
#   ./scripts/wait-for-services.sh --max-retries 60 --retry-interval 3
#
# Requirements: 5.1, 5.2, 12.7
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
BACKEND_URL="http://localhost:5003"
FRONTEND_URL="http://localhost:3000"
MAX_RETRIES=30
RETRY_INTERVAL=5
TIMEOUT=300

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-url)
            BACKEND_URL="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --max-retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --retry-interval)
            RETRY_INTERVAL="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --backend-url URL    Backend URL (default: http://localhost:5003)"
            echo "  --frontend-url URL   Frontend URL (default: http://localhost:3000)"
            echo "  --max-retries NUM    Maximum retry attempts (default: 30)"
            echo "  --retry-interval SEC Seconds between retries (default: 5)"
            echo "  --timeout SEC        Total timeout in seconds (default: 300)"
            echo ""
            echo "Example:"
            echo "  $0 --max-retries 60 --retry-interval 3"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

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

print_progress() {
    echo -e "${BLUE}[PROGRESS]${NC} $1"
}

# Function to check if curl is available
check_curl() {
    if ! command -v curl > /dev/null 2>&1; then
        print_error "curl is not installed. Please install curl to use this script."
        exit 1
    fi
}

# Function to wait for backend health endpoint
wait_for_backend() {
    local url="$BACKEND_URL/api/health"
    local attempt=0
    local start_time=$(date +%s)
    
    print_info "Waiting for backend health endpoint: $url"
    print_info "Max retries: $MAX_RETRIES, Retry interval: ${RETRY_INTERVAL}s, Timeout: ${TIMEOUT}s"
    
    while [ $attempt -lt $MAX_RETRIES ]; do
        # Check if timeout exceeded
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $TIMEOUT ]; then
            print_error "Timeout exceeded (${TIMEOUT}s). Backend did not become ready."
            return 1
        fi
        
        attempt=$((attempt + 1))
        print_progress "Attempt $attempt/$MAX_RETRIES - Checking backend health..."
        
        # Try to reach the health endpoint
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ]; then
            print_success "Backend is ready! (HTTP $response)"
            
            # Try to get health details
            local health_data=$(curl -s --max-time 5 "$url" 2>/dev/null || echo "")
            if [ -n "$health_data" ]; then
                echo "  Health response: $health_data"
            fi
            
            return 0
        else
            if [ "$response" = "000" ]; then
                print_progress "Backend not reachable yet (connection failed)"
            else
                print_progress "Backend not ready yet (HTTP $response)"
            fi
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                print_progress "Waiting ${RETRY_INTERVAL}s before next attempt..."
                sleep $RETRY_INTERVAL
            fi
        fi
    done
    
    print_error "Backend did not become ready after $MAX_RETRIES attempts"
    return 1
}

# Function to wait for frontend accessibility
wait_for_frontend() {
    local url="$FRONTEND_URL"
    local attempt=0
    local start_time=$(date +%s)
    
    print_info "Waiting for frontend accessibility: $url"
    print_info "Max retries: $MAX_RETRIES, Retry interval: ${RETRY_INTERVAL}s, Timeout: ${TIMEOUT}s"
    
    while [ $attempt -lt $MAX_RETRIES ]; do
        # Check if timeout exceeded
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $TIMEOUT ]; then
            print_error "Timeout exceeded (${TIMEOUT}s). Frontend did not become accessible."
            return 1
        fi
        
        attempt=$((attempt + 1))
        print_progress "Attempt $attempt/$MAX_RETRIES - Checking frontend accessibility..."
        
        # Try to reach the frontend
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
        
        if [ "$response" = "200" ] || [ "$response" = "304" ]; then
            print_success "Frontend is accessible! (HTTP $response)"
            return 0
        else
            if [ "$response" = "000" ]; then
                print_progress "Frontend not reachable yet (connection failed)"
            else
                print_progress "Frontend not accessible yet (HTTP $response)"
            fi
            
            if [ $attempt -lt $MAX_RETRIES ]; then
                print_progress "Waiting ${RETRY_INTERVAL}s before next attempt..."
                sleep $RETRY_INTERVAL
            fi
        fi
    done
    
    print_error "Frontend did not become accessible after $MAX_RETRIES attempts"
    return 1
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      SpecWeave Docker Wait-for-Services Script            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Check prerequisites
    check_curl
    
    # Wait for backend
    echo ""
    echo -e "${BLUE}━━━ Backend Service ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! wait_for_backend; then
        print_error "Failed to wait for backend service"
        echo ""
        echo "Troubleshooting tips:"
        echo "  - Check if backend container is running: docker ps | grep backend"
        echo "  - Check backend logs: docker-compose logs backend"
        echo "  - Verify backend health endpoint: curl $BACKEND_URL/api/health"
        exit 1
    fi
    
    # Wait for frontend
    echo ""
    echo -e "${BLUE}━━━ Frontend Service ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if ! wait_for_frontend; then
        print_error "Failed to wait for frontend service"
        echo ""
        echo "Troubleshooting tips:"
        echo "  - Check if frontend container is running: docker ps | grep frontend"
        echo "  - Check frontend logs: docker-compose logs frontend"
        echo "  - Verify frontend accessibility: curl $FRONTEND_URL"
        exit 1
    fi
    
    # All services ready
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    print_success "All services are ready!"
    echo ""
    echo "Service URLs:"
    echo "  Backend:  $BACKEND_URL"
    echo "  Frontend: $FRONTEND_URL"
    echo ""
    
    exit 0
}

# Run main function
main
