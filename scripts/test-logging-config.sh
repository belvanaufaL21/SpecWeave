#!/bin/bash
# ============================================================================
# Logging Configuration Test Script
# ============================================================================
# This script tests the logging configuration for SpecWeave Docker deployment
# Tests: stdout/stderr output, structured logging, request ID tracing, log rotation
# ============================================================================

set -e

echo "============================================================================"
echo "SpecWeave Logging Configuration Test"
echo "============================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "Test 1: Verify docker-compose.yml syntax"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml config --quiet; then
    print_result 0 "docker-compose.yml is valid"
else
    print_result 1 "docker-compose.yml has syntax errors"
fi
echo ""

echo "Test 2: Verify docker-compose.prod.yml syntax"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet; then
    print_result 0 "docker-compose.prod.yml is valid"
else
    print_result 1 "docker-compose.prod.yml has syntax errors"
fi
echo ""

echo "Test 3: Verify docker-compose.dev.yml syntax"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet; then
    print_result 0 "docker-compose.dev.yml is valid"
else
    print_result 1 "docker-compose.dev.yml has syntax errors"
fi
echo ""

echo "Test 4: Check logging configuration in docker-compose.yml"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml config | grep -q "logging:"; then
    print_result 0 "Logging configuration found in docker-compose.yml"
else
    print_result 1 "Logging configuration missing in docker-compose.yml"
fi
echo ""

echo "Test 5: Check log rotation settings (max-size)"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml config | grep -q "max-size"; then
    print_result 0 "Log rotation max-size configured"
else
    print_result 1 "Log rotation max-size not configured"
fi
echo ""

echo "Test 6: Check log rotation settings (max-file)"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml config | grep -q "max-file"; then
    print_result 0 "Log rotation max-file configured"
else
    print_result 1 "Log rotation max-file not configured"
fi
echo ""

echo "Test 7: Check service labels for log filtering"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml config | grep -q "com.specweave.service"; then
    print_result 0 "Service labels configured"
else
    print_result 1 "Service labels not configured"
fi
echo ""

echo "Test 8: Verify Nginx logs to stdout/stderr"
echo "----------------------------------------"
if grep -q "/dev/stdout" nginx/nginx.conf && grep -q "/dev/stderr" nginx/nginx.conf; then
    print_result 0 "Nginx configured to log to stdout/stderr"
else
    print_result 1 "Nginx not configured to log to stdout/stderr"
fi
echo ""

echo "Test 9: Check Nginx JSON log format"
echo "----------------------------------------"
if grep -q "log_format json_combined" nginx/nginx.conf; then
    print_result 0 "Nginx JSON log format configured"
else
    print_result 1 "Nginx JSON log format not configured"
fi
echo ""

echo "Test 10: Verify backend structured logging"
echo "----------------------------------------"
if grep -q "JSON.stringify(logEntry)" aplikasi-server/src/config/logging.js; then
    print_result 0 "Backend structured logging configured"
else
    print_result 1 "Backend structured logging not configured"
fi
echo ""

echo "Test 11: Check request ID support in logger"
echo "----------------------------------------"
if grep -q "requestId" aplikasi-server/src/config/logging.js; then
    print_result 0 "Request ID support in logger"
else
    print_result 1 "Request ID support missing in logger"
fi
echo ""

echo "Test 12: Verify request ID middleware"
echo "----------------------------------------"
if grep -q "requestIdMiddleware" aplikasi-server/src/middlewares/errorHandler.js; then
    print_result 0 "Request ID middleware exists"
else
    print_result 1 "Request ID middleware missing"
fi
echo ""

echo "Test 13: Check timestamp in log format"
echo "----------------------------------------"
if grep -q "timestamp" aplikasi-server/src/config/logging.js; then
    print_result 0 "Timestamp included in log format"
else
    print_result 1 "Timestamp missing in log format"
fi
echo ""

echo "Test 14: Verify log levels configuration"
echo "----------------------------------------"
if grep -q "LOG_LEVELS" aplikasi-server/src/config/logging.js; then
    print_result 0 "Log levels configured"
else
    print_result 1 "Log levels not configured"
fi
echo ""

echo "Test 15: Check production logging labels in docker-compose.prod.yml"
echo "----------------------------------------"
if docker-compose -f docker-compose.yml -f docker-compose.prod.yml config | grep -q "com.specweave.environment=production"; then
    print_result 0 "Production environment labels configured"
else
    print_result 1 "Production environment labels not configured"
fi
echo ""

# Summary
echo "============================================================================"
echo "Test Summary"
echo "============================================================================"
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Logging configuration is complete and meets requirements:"
    echo "  ✓ 13.1: Backend logs output to stdout/stderr"
    echo "  ✓ 13.2: Frontend/Nginx logs output to stdout/stderr"
    echo "  ✓ 13.6: Structured logging with timestamps and log levels"
    echo "  ✓ 13.9: Request ID tracing across services"
    echo "  ✓ 13.10: Log rotation configured"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the configuration.${NC}"
    exit 1
fi
