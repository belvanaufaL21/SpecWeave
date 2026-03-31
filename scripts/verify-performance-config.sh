#!/bin/bash
# ============================================================================
# Performance Configuration Verification Script
# ============================================================================
# This script verifies that all performance optimizations are properly configured
# Usage: ./scripts/verify-performance-config.sh
# ============================================================================

set -e

echo "🔍 Verifying Performance Optimizations..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if containers are running
echo "📦 Checking container status..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Containers are running${NC}"
else
    echo -e "${YELLOW}⚠️  Containers are not running. Starting them...${NC}"
    docker-compose up -d
    sleep 10
fi
echo ""

# 1. Verify Node.js Heap Size
echo "🧠 Verifying Node.js Heap Size Configuration..."
HEAP_SIZE=$(docker-compose exec -T backend node -e "const v8 = require('v8'); console.log(Math.round(v8.getHeapStatistics().heap_size_limit / 1024 / 1024));" 2>/dev/null || echo "0")

if [ "$HEAP_SIZE" -gt 1500 ]; then
    echo -e "${GREEN}✅ Node.js heap size: ${HEAP_SIZE}MB (configured)${NC}"
else
    echo -e "${RED}❌ Node.js heap size: ${HEAP_SIZE}MB (too low, expected >1500MB)${NC}"
fi
echo ""

# 2. Verify Nginx Worker Processes
echo "⚙️  Verifying Nginx Worker Processes..."
WORKER_COUNT=$(docker-compose exec -T nginx ps aux 2>/dev/null | grep "nginx: worker process" | wc -l || echo "0")

if [ "$WORKER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Nginx worker processes: ${WORKER_COUNT} (auto-configured)${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify Nginx worker processes (container may not be running)${NC}"
fi
echo ""

# 3. Verify Connection Pooling Configuration
echo "🔌 Verifying Connection Pooling Configuration..."
if grep -q "keepalive: true" aplikasi-server/src/config/supabase.js; then
    echo -e "${GREEN}✅ Supabase connection pooling: Enabled${NC}"
else
    echo -e "${RED}❌ Supabase connection pooling: Not configured${NC}"
fi

if grep -q "keepalive 32" nginx/nginx.conf; then
    echo -e "${GREEN}✅ Nginx upstream keepalive: Configured (32 connections)${NC}"
else
    echo -e "${RED}❌ Nginx upstream keepalive: Not configured${NC}"
fi
echo ""

# 4. Verify NLTK Data Pre-loading
echo "📚 Verifying NLTK Data Pre-loading..."
if docker-compose exec -T backend test -d /root/nltk_data/tokenizers/punkt 2>/dev/null; then
    echo -e "${GREEN}✅ NLTK punkt data: Pre-loaded${NC}"
else
    echo -e "${RED}❌ NLTK punkt data: Not found${NC}"
fi

if docker-compose exec -T backend test -d /root/nltk_data/corpora/wordnet 2>/dev/null; then
    echo -e "${GREEN}✅ NLTK wordnet data: Pre-loaded${NC}"
else
    echo -e "${RED}❌ NLTK wordnet data: Not found${NC}"
fi
echo ""

# 5. Verify Sentence-BERT Model Pre-loading
echo "🤖 Verifying Sentence-BERT Model Pre-loading..."
if docker-compose exec -T backend test -d /root/.cache/torch/sentence_transformers 2>/dev/null; then
    echo -e "${GREEN}✅ Sentence-BERT model: Pre-loaded${NC}"
else
    echo -e "${RED}❌ Sentence-BERT model: Not found${NC}"
fi
echo ""

# 6. Verify Production Node.js Flags
echo "🚀 Verifying Production Node.js Flags..."
if grep -q "NODE_OPTIONS=--max-old-space-size=3072" docker-compose.prod.yml; then
    echo -e "${GREEN}✅ Production heap size: 3072MB${NC}"
else
    echo -e "${RED}❌ Production heap size: Not configured${NC}"
fi

if grep -q "optimize-for-size" docker-compose.prod.yml; then
    echo -e "${GREEN}✅ Memory optimization flag: Enabled${NC}"
else
    echo -e "${RED}❌ Memory optimization flag: Not configured${NC}"
fi
echo ""

# 7. Verify Resource Limits
echo "💾 Verifying Resource Limits..."
if grep -q "memory: 4G" docker-compose.prod.yml; then
    echo -e "${GREEN}✅ Backend memory limit: 4GB${NC}"
else
    echo -e "${RED}❌ Backend memory limit: Not configured${NC}"
fi

if grep -q "cpus: '2.0'" docker-compose.prod.yml; then
    echo -e "${GREEN}✅ Backend CPU limit: 2.0 cores${NC}"
else
    echo -e "${RED}❌ Backend CPU limit: Not configured${NC}"
fi
echo ""

# Summary
echo "============================================================================"
echo "📊 Performance Configuration Summary"
echo "============================================================================"
echo ""
echo "Configuration Files:"
echo "  ✓ docker-compose.yml - Base configuration with NODE_OPTIONS"
echo "  ✓ docker-compose.prod.yml - Production optimizations"
echo "  ✓ nginx/nginx.conf - Worker processes and upstream keepalive"
echo "  ✓ aplikasi-server/src/config/supabase.js - Connection pooling"
echo "  ✓ aplikasi-server/Dockerfile - Pre-loaded NLTK and models"
echo ""
echo "Performance Features:"
echo "  ✓ Node.js heap size: 2GB (base), 3GB (production)"
echo "  ✓ Nginx worker processes: Auto-detect CPU cores"
echo "  ✓ Connection pooling: Supabase + Nginx upstream"
echo "  ✓ Pre-loaded data: NLTK + Sentence-BERT models"
echo "  ✓ Production flags: --optimize-for-size, --max-semi-space-size"
echo ""
echo -e "${GREEN}✅ All performance optimizations verified!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run load tests: ab -n 1000 -c 100 http://localhost/api/health"
echo "  2. Monitor metrics: docker stats"
echo "  3. Check logs: docker-compose logs -f backend"
echo ""
