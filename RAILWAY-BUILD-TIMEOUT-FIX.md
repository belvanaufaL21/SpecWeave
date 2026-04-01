# Railway Build Timeout - Solutions

## Problem
Your build is timing out at the "importing to docker" stage after 10 minutes. The Docker image is too large (~3-4GB) due to:
- PyTorch with CUDA (888 MB)
- CUDNN (706 MB)  
- Other ML dependencies (transformers, sentence-transformers, etc.)

## Solution 1: Use CPU-Only PyTorch (RECOMMENDED)

Railway doesn't provide GPU access, so you don't need CUDA dependencies.

### Update `aplikasi-server/src/python/requirements.txt`

Replace:
```txt
torch>=2.0.0
```

With:
```txt
torch>=2.0.0 --index-url https://download.pytorch.org/whl/cpu
```

This will reduce the image size by ~2GB (from ~3.5GB to ~1.5GB).

### Benefits:
- ✅ 60% smaller image
- ✅ Faster builds (3-5 minutes instead of 10+)
- ✅ Lower memory usage
- ✅ Same functionality (Railway has no GPU anyway)

## Solution 2: Multi-Stage Build (ADVANCED)

Create a builder stage to reduce final image size:

```dockerfile
# Stage 1: Builder
FROM node:18-bullseye AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY src/python/requirements.txt /app/src/python/requirements.txt
RUN pip3 install --no-cache-dir -r /app/src/python/requirements.txt

# Download models
RUN python3 -c "import nltk; \
    nltk.download('punkt', quiet=True); \
    nltk.download('wordnet', quiet=True); \
    nltk.download('omw-1.4', quiet=True)" && \
    python3 -c "from sentence_transformers import SentenceTransformer; \
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2'); \
    print('Model downloaded successfully')"

# Install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.9/dist-packages /usr/local/lib/python3.9/dist-packages

# Copy Node modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=node:node . .

RUN mkdir -p /app/logs && chown -R node:node /app/logs

USER node
EXPOSE 5003

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5003/api/system/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["npm", "start"]
```

## Solution 3: Increase Railway Build Timeout

Railway Pro plan has longer build timeouts (20 minutes vs 10 minutes).

## Solution 4: Pre-build Docker Image

Build and push to Docker Hub, then deploy from there:

```bash
# Build locally
docker build -t yourusername/specweave-backend:latest ./aplikasi-server

# Push to Docker Hub
docker push yourusername/specweave-backend:latest

# In Railway, use Docker Hub image instead of building
```

## Recommended Action Plan

### Step 1: Use CPU-Only PyTorch (Easiest & Best)

1. Update `aplikasi-server/src/python/requirements.txt`
2. Change the torch line to use CPU-only version
3. Commit and push
4. Railway will rebuild automatically

### Step 2: If Still Timing Out

1. Implement multi-stage build
2. This will reduce final image size further

### Step 3: Monitor Build

Watch the Railway logs to see:
- Build time improvement
- Image size reduction
- Successful deployment

## Expected Results

### Before (Current):
- Build time: 10+ minutes (timeout)
- Image size: ~3.5 GB
- Status: ❌ Failed

### After (CPU-only PyTorch):
- Build time: 5-7 minutes
- Image size: ~1.5 GB
- Status: ✅ Success

### After (Multi-stage + CPU):
- Build time: 6-8 minutes
- Image size: ~1.0 GB
- Status: ✅ Success

## Why This Works

1. **No GPU on Railway**: CUDA dependencies are useless
2. **CPU PyTorch**: Same API, smaller size
3. **Faster Downloads**: Less data to transfer
4. **Faster Import**: Smaller image to load into Docker

## Next Steps

Choose Solution 1 (CPU-only PyTorch) and I'll help you implement it.
