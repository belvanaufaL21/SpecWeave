# Backend Production Dockerfile
# Multi-runtime container with Node.js 18+ and Python 3.8+
# Security: Uses official images, non-root user, minimal attack surface

FROM node:18-bullseye

# Install Python 3.8+, pip, and build dependencies in a single layer
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements and install packages
COPY src/python/requirements.txt /app/src/python/requirements.txt
RUN pip3 install --no-cache-dir -r /app/src/python/requirements.txt

# Download NLTK data and Sentence-BERT model in a single layer
RUN python3 -c "import nltk; \
    nltk.download('punkt', quiet=True); \
    nltk.download('wordnet', quiet=True); \
    nltk.download('omw-1.4', quiet=True)" && \
    python3 -c "from sentence_transformers import SentenceTransformer; \
    model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2'); \
    print('Model downloaded successfully')"

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code (after dependencies for better caching)
COPY --chown=node:node . .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Use non-root user for security
USER node

# Expose backend port
EXPOSE 5003

# Health check for API endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5003/api/system/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["npm", "start"]
