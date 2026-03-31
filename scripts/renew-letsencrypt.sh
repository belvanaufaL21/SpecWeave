#!/bin/bash
# ============================================================================
# Let's Encrypt SSL Certificate Renewal Script
# ============================================================================
# This script renews Let's Encrypt SSL certificates
# Can be run manually or scheduled with cron
#
# Cron example (renew every day at 2am):
#   0 2 * * * /path/to/scripts/renew-letsencrypt.sh >> /var/log/letsencrypt-renewal.log 2>&1
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SSL_DIR="./nginx/ssl"

echo -e "${CYAN}=== Let's Encrypt Certificate Renewal ===${NC}"
echo "Date: $(date)"
echo ""

# Check if certificates exist
if [ ! -d "$SSL_DIR/live" ]; then
    echo "Error: No certificates found. Run setup-letsencrypt.sh first"
    exit 1
fi

# Get domain from existing certificate
DOMAIN=$(ls "$SSL_DIR/live" | head -n1)
echo "Domain: $DOMAIN"

echo -e "${YELLOW}Attempting renewal...${NC}"

# Stop nginx temporarily to free port 80
docker-compose stop nginx

# Renew certificate
docker run --rm \
    -v "$PWD/$SSL_DIR:/etc/letsencrypt" \
    -v "$PWD/$SSL_DIR/lib:/var/lib/letsencrypt" \
    -p 80:80 \
    certbot/certbot renew \
    --standalone \
    --preferred-challenges http

# Copy renewed certificates
if [ -f "$SSL_DIR/live/$DOMAIN/fullchain.pem" ]; then
    cp "$SSL_DIR/live/$DOMAIN/fullchain.pem" "$SSL_DIR/certificate.crt"
    cp "$SSL_DIR/live/$DOMAIN/privkey.pem" "$SSL_DIR/private.key"
    chmod 644 "$SSL_DIR/certificate.crt"
    chmod 600 "$SSL_DIR/private.key"
    echo -e "${GREEN}✓ Certificates renewed and copied${NC}"
fi

# Restart nginx
docker-compose start nginx

echo -e "${GREEN}=== Renewal Complete ===${NC}"
echo "Next renewal check: $(date -d '+30 days')"
