#!/bin/bash

# ============================================================================
# Docker Security Verification Script
# ============================================================================
# This script verifies that all Docker security best practices are implemented
# according to requirements 11.1-11.9
# ============================================================================

set -e

echo "=========================================="
echo "Docker Security Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to print test result
print_result() {
    local test_name=$1
    local result=$2
    local message=$3
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        [ -n "$message" ] && echo "  $message"
        ((PASSED++))
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}✗${NC} $test_name"
        [ -n "$message" ] && echo "  $message"
        ((FAILED++))
    else
        echo -e "${YELLOW}⚠${NC} $test_name"
        [ -n "$message" ] && echo "  $message"
        ((WARNINGS++))
    fi
}

echo "Requirement 11.1: Non-root user verification"
echo "----------------------------------------------"

# Check if containers are running
if docker ps | grep -q "specweave-frontend"; then
    FRONTEND_USER=$(docker exec specweave-frontend whoami 2>/dev/null || echo "error")
    if [ "$FRONTEND_USER" = "nginx" ]; then
        print_result "Frontend runs as non-root user (nginx)" "PASS"
    else
        print_result "Frontend user check" "FAIL" "Expected: nginx, Got: $FRONTEND_USER"
    fi
else
    print_result "Frontend container check" "WARN" "Container not running. Start with: docker-compose up -d"
fi

if docker ps | grep -q "specweave-backend"; then
    BACKEND_USER=$(docker exec specweave-backend whoami 2>/dev/null || echo "error")
    if [ "$BACKEND_USER" = "node" ]; then
        print_result "Backend runs as non-root user (node)" "PASS"
    else
        print_result "Backend user check" "FAIL" "Expected: node, Got: $BACKEND_USER"
    fi
else
    print_result "Backend container check" "WARN" "Container not running. Start with: docker-compose up -d"
fi

echo ""
echo "Requirement 11.2: Official base images verification"
echo "----------------------------------------------"

# Check Dockerfiles for official images
if grep -q "FROM node:18-alpine" aplikasi-klien/Dockerfile && grep -q "FROM nginx:alpine" aplikasi-klien/Dockerfile; then
    print_result "Frontend uses official images (node:18-alpine, nginx:alpine)" "PASS"
else
    print_result "Frontend base images" "FAIL" "Not using official images"
fi

if grep -q "FROM node:18-bullseye" aplikasi-server/Dockerfile; then
    print_result "Backend uses official image (node:18-bullseye)" "PASS"
else
    print_result "Backend base image" "FAIL" "Not using official image"
fi

if [ -f "docker-compose.prod.yml" ] && grep -q "image: nginx:alpine" docker-compose.prod.yml; then
    print_result "Nginx proxy uses official image (nginx:alpine)" "PASS"
else
    print_result "Nginx proxy base image" "FAIL" "Not using official image"
fi

echo ""
echo "Requirement 11.3: Docker image scanning documentation"
echo "----------------------------------------------"

if [ -f ".kiro/specs/docker-deployment-setup/DOCKER-SECURITY.md" ]; then
    if grep -q "Docker Image Scanning" .kiro/specs/docker-deployment-setup/DOCKER-SECURITY.md; then
        print_result "Security documentation exists with scanning guide" "PASS"
    else
        print_result "Security documentation" "FAIL" "Missing scanning section"
    fi
else
    print_result "Security documentation" "FAIL" "DOCKER-SECURITY.md not found"
fi

if [ -f ".github/workflows/docker-security-scan.yml.example" ]; then
    print_result "CI/CD security scan example provided" "PASS"
else
    print_result "CI/CD example" "WARN" "Example workflow not found"
fi

echo ""
echo "Requirement 11.4: Minimal attack surface"
echo "----------------------------------------------"

# Check for Alpine images (smaller attack surface)
if grep -q "alpine" aplikasi-klien/Dockerfile; then
    print_result "Frontend uses Alpine-based images" "PASS"
else
    print_result "Frontend Alpine usage" "WARN" "Not using Alpine images"
fi

# Check for multi-stage build
if grep -q "AS builder" aplikasi-klien/Dockerfile; then
    print_result "Frontend uses multi-stage build" "PASS"
else
    print_result "Frontend multi-stage build" "FAIL" "Not using multi-stage build"
fi

# Check for cleanup commands
if grep -q "rm -rf /var/lib/apt/lists" aplikasi-server/Dockerfile; then
    print_result "Backend cleans up package manager cache" "PASS"
else
    print_result "Backend cleanup" "WARN" "Package cache not cleaned"
fi

echo ""
echo "Requirement 11.6: Secrets management"
echo "----------------------------------------------"

# Check for .env.example
if [ -f ".env.example" ]; then
    print_result ".env.example template exists" "PASS"
else
    print_result ".env.example" "FAIL" "Template not found"
fi

# Check that .env is in .gitignore
if [ -f ".gitignore" ] && grep -q "^\.env$" .gitignore; then
    print_result ".env is in .gitignore" "PASS"
else
    print_result ".gitignore check" "FAIL" ".env not properly ignored"
fi

# Check for hardcoded secrets in Dockerfiles
if grep -iE "(password|secret|key|token).*=" aplikasi-*/Dockerfile 2>/dev/null; then
    print_result "No hardcoded secrets in Dockerfiles" "FAIL" "Found potential hardcoded secrets"
else
    print_result "No hardcoded secrets in Dockerfiles" "PASS"
fi

echo ""
echo "Requirement 11.7: Security headers in Nginx"
echo "----------------------------------------------"

# Check nginx configurations for security headers
SECURITY_HEADERS=("X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection" "Referrer-Policy")
HEADERS_FOUND=0

for header in "${SECURITY_HEADERS[@]}"; do
    if grep -q "$header" nginx/default.conf 2>/dev/null || grep -q "$header" aplikasi-klien/nginx.conf 2>/dev/null; then
        ((HEADERS_FOUND++))
    fi
done

if [ $HEADERS_FOUND -eq ${#SECURITY_HEADERS[@]} ]; then
    print_result "All security headers configured" "PASS" "Found: ${SECURITY_HEADERS[*]}"
else
    print_result "Security headers" "FAIL" "Missing some security headers"
fi

echo ""
echo "Requirement 11.8: Read-only filesystem configuration"
echo "----------------------------------------------"

if [ -f "docker-compose.prod.yml" ]; then
    if grep -q "read_only: true" docker-compose.prod.yml; then
        print_result "Read-only filesystem configured in production" "PASS"
    else
        print_result "Read-only filesystem" "FAIL" "Not configured in docker-compose.prod.yml"
    fi
    
    if grep -q "tmpfs:" docker-compose.prod.yml; then
        print_result "Tmpfs mounts configured for writable directories" "PASS"
    else
        print_result "Tmpfs mounts" "WARN" "No tmpfs mounts found"
    fi
else
    print_result "Production compose file" "FAIL" "docker-compose.prod.yml not found"
fi

echo ""
echo "Requirement 11.9: Network isolation"
echo "----------------------------------------------"

if [ -f "docker-compose.yml" ]; then
    if grep -q "specweave-network" docker-compose.yml; then
        print_result "Custom bridge network configured" "PASS"
    else
        print_result "Custom network" "FAIL" "No custom network defined"
    fi
else
    print_result "Base compose file" "FAIL" "docker-compose.yml not found"
fi

# Check if containers are on the same network
if docker network ls | grep -q "specweave-network"; then
    print_result "specweave-network exists" "PASS"
else
    print_result "Network existence" "WARN" "Network not created yet. Run: docker-compose up -d"
fi

echo ""
echo "Additional Security Checks"
echo "----------------------------------------------"

# Check for exposed unnecessary ports in production
if [ -f "docker-compose.prod.yml" ]; then
    if grep -A 5 "frontend:" docker-compose.prod.yml | grep -q "ports: \[\]"; then
        print_result "Frontend ports not exposed in production" "PASS"
    else
        print_result "Frontend port exposure" "WARN" "Frontend may be directly exposed"
    fi
fi

# Check for health checks
if grep -q "HEALTHCHECK" aplikasi-server/Dockerfile; then
    print_result "Backend has health check configured" "PASS"
else
    print_result "Backend health check" "WARN" "No health check in Dockerfile"
fi

if grep -q "HEALTHCHECK" aplikasi-klien/Dockerfile; then
    print_result "Frontend has health check configured" "PASS"
else
    print_result "Frontend health check" "WARN" "No health check in Dockerfile"
fi

# Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical security requirements met!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some security requirements failed. Please review and fix.${NC}"
    exit 1
fi
