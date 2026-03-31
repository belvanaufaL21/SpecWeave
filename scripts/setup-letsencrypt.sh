#!/bin/bash
# ============================================================================
# Let's Encrypt SSL Certificate Setup Script for SpecWeave
# ============================================================================
# This script helps setup Let's Encrypt SSL certificates using Certbot
# 
# Prerequisites:
#   - Domain name pointing to your server
#   - Ports 80 and 443 accessible from internet
#   - Docker and Docker Compose installed
#
# Usage:
#   bash scripts/setup-letsencrypt.sh yourdomain.com your@email.com
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 specweave.com admin@specweave.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
SSL_DIR="./nginx/ssl"

echo -e "${CYAN}=== Let's Encrypt SSL Setup ===${NC}"
echo ""
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "SSL Directory: $SSL_DIR"
echo ""

# Create SSL directory if not exists
mkdir -p "$SSL_DIR"

echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if domain resolves to this server
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -n1)

echo "Server IP: $SERVER_IP"
echo "Domain IP: $DOMAIN_IP"

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo -e "${YELLOW}Warning: Domain does not point to this server${NC}"
    echo "Please update your DNS records to point $DOMAIN to $SERVER_IP"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${YELLOW}Step 2: Obtaining SSL certificate with Certbot...${NC}"

# Run Certbot in Docker to obtain certificate
docker run -it --rm \
    -v "$PWD/$SSL_DIR:/etc/letsencrypt" \
    -v "$PWD/$SSL_DIR/lib:/var/lib/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificate obtained successfully${NC}"
else
    echo -e "${RED}✗ Failed to obtain certificate${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 3: Copying certificates to nginx/ssl...${NC}"

# Copy certificates to nginx ssl directory
cp "$SSL_DIR/live/$DOMAIN/fullchain.pem" "$SSL_DIR/certificate.crt"
cp "$SSL_DIR/live/$DOMAIN/privkey.pem" "$SSL_DIR/private.key"

echo -e "${GREEN}✓ Certificates copied${NC}"

echo -e "${YELLOW}Step 4: Setting permissions...${NC}"
chmod 644 "$SSL_DIR/certificate.crt"
chmod 600 "$SSL_DIR/private.key"
echo -e "${GREEN}✓ Permissions set${NC}"

echo ""
echo -e "${GREEN}=== SSL Setup Complete! ===${NC}"
echo ""
echo "Next steps:"
echo "1. Update nginx/default.conf to enable HTTPS server block"
echo "2. Update DOMAIN environment variable in .env"
echo "3. Restart production deployment:"
echo "   docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart"
echo ""
echo "Certificate will expire in 90 days. Setup auto-renewal with:"
echo "   bash scripts/renew-letsencrypt.sh"
