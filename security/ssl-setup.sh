#!/bin/bash

# SSL/TLS Setup Script for FluxStudio Production
# Automated SSL certificate generation and security hardening

set -e

# Configuration
DOMAIN="${DOMAIN:-fluxstudio.art}"
EMAIL="${CERTBOT_EMAIL:-admin@fluxstudio.art}"
SSL_DIR="./nginx/ssl"
CERTBOT_DIR="./nginx/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Create required directories
setup_directories() {
    echo "📁 Setting up SSL directories..."

    mkdir -p "$SSL_DIR"
    mkdir -p "$CERTBOT_DIR"
    mkdir -p "./nginx/conf.d"

    print_status "SSL directories created"
}

# Generate self-signed certificates for development/testing
generate_self_signed() {
    echo "🔒 Generating self-signed certificates for testing..."

    # Generate private key
    openssl genrsa -out "$SSL_DIR/privkey.pem" 2048

    # Generate certificate
    openssl req -new -x509 -key "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -days 365 \
        -subj "/C=US/ST=CA/L=San Francisco/O=FluxStudio/OU=Development/CN=$DOMAIN"

    # Copy for chain
    cp "$SSL_DIR/fullchain.pem" "$SSL_DIR/chain.pem"

    print_status "Self-signed certificates generated"
    print_warning "These are for testing only. Use Let's Encrypt for production!"
}

# Generate strong DH parameters
generate_dhparam() {
    echo "🔐 Generating DH parameters..."

    if [ ! -f "./nginx/dhparam.pem" ]; then
        print_warning "This will take several minutes..."
        openssl dhparam -out "./nginx/dhparam.pem" 2048
        print_status "DH parameters generated"
    else
        print_status "DH parameters already exist"
    fi
}

# Setup Let's Encrypt certificates
setup_letsencrypt() {
    echo "🌐 Setting up Let's Encrypt certificates..."

    # Check if certificates already exist
    if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
        print_status "SSL certificates already exist"
        return 0
    fi

    # Create temporary nginx config for certificate challenge
    cat > ./nginx/nginx.temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name fluxstudio.art www.fluxstudio.art;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }
}
EOF

    # Start temporary nginx for verification
    docker run -d --name nginx-certbot-temp \
        -p 80:80 \
        -v "$PWD/nginx/nginx.temp.conf:/etc/nginx/nginx.conf" \
        -v "$PWD/$CERTBOT_DIR:/var/www/certbot" \
        nginx:alpine

    # Get certificates
    docker run --rm \
        -v "$PWD/$SSL_DIR:/etc/letsencrypt" \
        -v "$PWD/$CERTBOT_DIR:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"

    # Stop temporary nginx
    docker stop nginx-certbot-temp
    docker rm nginx-certbot-temp

    # Copy certificates to nginx directory
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
    cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$SSL_DIR/"

    print_status "Let's Encrypt certificates obtained"
}

# Setup SSL security headers configuration
setup_security_headers() {
    echo "🛡️ Setting up security headers..."

    cat > ./nginx/conf.d/security-headers.conf << 'EOF'
# Security Headers Configuration

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# X-Frame-Options
add_header X-Frame-Options "DENY" always;

# X-Content-Type-Options
add_header X-Content-Type-Options "nosniff" always;

# X-XSS-Protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://accounts.google.com https://appleid.apple.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:; frame-src 'self' https://accounts.google.com https://appleid.apple.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self';" always;

# Feature Policy / Permissions Policy
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()" always;

# Remove server tokens
server_tokens off;
EOF

    print_status "Security headers configuration created"
}

# Setup SSL certificate monitoring
setup_ssl_monitoring() {
    echo "📊 Setting up SSL certificate monitoring..."

    cat > ./scripts/check-ssl-expiry.sh << 'EOF'
#!/bin/bash
# SSL Certificate Expiry Checker

DOMAIN="fluxstudio.art"
DAYS_WARNING=30

# Check certificate expiry
EXPIRY_DATE=$(openssl x509 -in ./nginx/ssl/fullchain.pem -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_REMAINING=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

echo "SSL Certificate Status for $DOMAIN:"
echo "Expiry Date: $EXPIRY_DATE"
echo "Days Remaining: $DAYS_REMAINING"

if [ $DAYS_REMAINING -lt $DAYS_WARNING ]; then
    echo "⚠️ WARNING: SSL certificate expires in $DAYS_REMAINING days!"
    exit 1
else
    echo "✅ SSL certificate is valid for $DAYS_REMAINING more days"
    exit 0
fi
EOF

    chmod +x ./scripts/check-ssl-expiry.sh

    print_status "SSL monitoring script created"
}

# Setup automatic certificate renewal
setup_auto_renewal() {
    echo "🔄 Setting up automatic certificate renewal..."

    cat > ./scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# Automatic SSL Certificate Renewal

set -e

echo "🔄 Starting SSL certificate renewal..."

# Renew certificates
docker run --rm \
    -v "$PWD/nginx/ssl:/etc/letsencrypt" \
    -v "$PWD/nginx/certbot:/var/www/certbot" \
    certbot/certbot renew --quiet

# Reload nginx if renewal was successful
if [ $? -eq 0 ]; then
    echo "✅ Certificate renewal successful"
    docker-compose -f docker-compose.prod.yml restart nginx
    echo "✅ Nginx restarted"
else
    echo "❌ Certificate renewal failed"
    exit 1
fi
EOF

    chmod +x ./scripts/renew-ssl.sh

    # Create cron job for automatic renewal (runs twice daily)
    CRON_JOB="0 */12 * * * $PWD/scripts/renew-ssl.sh >> $PWD/logs/ssl-renewal.log 2>&1"

    # Add to crontab if not already present
    (crontab -l 2>/dev/null | grep -v renew-ssl.sh; echo "$CRON_JOB") | crontab -

    print_status "Automatic renewal configured (runs twice daily)"
}

# Validate SSL configuration
validate_ssl() {
    echo "✅ Validating SSL configuration..."

    # Check if certificates exist
    if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
        print_error "SSL certificates not found"
        return 1
    fi

    # Check certificate validity
    if openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -checkend 86400; then
        print_status "SSL certificates are valid"
    else
        print_error "SSL certificates are invalid or expiring soon"
        return 1
    fi

    # Check private key matches certificate
    CERT_MODULUS=$(openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -modulus | openssl md5)
    KEY_MODULUS=$(openssl rsa -in "$SSL_DIR/privkey.pem" -noout -modulus | openssl md5)

    if [ "$CERT_MODULUS" = "$KEY_MODULUS" ]; then
        print_status "Private key matches certificate"
    else
        print_error "Private key does not match certificate"
        return 1
    fi

    print_status "SSL configuration validation completed"
}

# Main function
main() {
    echo "🔒 FluxStudio SSL/TLS Setup"
    echo "=========================="

    setup_directories

    case "${1:-production}" in
        "development"|"dev")
            generate_self_signed
            ;;
        "production"|"prod")
            setup_letsencrypt
            ;;
        "self-signed")
            generate_self_signed
            ;;
        *)
            print_error "Invalid mode. Use: development, production, or self-signed"
            exit 1
            ;;
    esac

    generate_dhparam
    setup_security_headers
    setup_ssl_monitoring
    setup_auto_renewal
    validate_ssl

    echo ""
    echo "🎉 SSL/TLS Setup Complete!"
    echo "========================="
    echo ""
    echo "📄 Certificates: $SSL_DIR/"
    echo "🔧 Monitoring: ./scripts/check-ssl-expiry.sh"
    echo "🔄 Auto-renewal: Configured (twice daily)"
    echo ""
    print_status "SSL/TLS configuration completed successfully!"
}

# Handle script arguments
case "${1:-production}" in
    "development"|"dev"|"production"|"prod"|"self-signed")
        main "$1"
        ;;
    "check")
        validate_ssl
        ;;
    "renew")
        ./scripts/renew-ssl.sh
        ;;
    "monitor")
        ./scripts/check-ssl-expiry.sh
        ;;
    *)
        echo "Usage: $0 [development|production|self-signed|check|renew|monitor]"
        echo "  development  - Generate self-signed certificates for dev"
        echo "  production   - Setup Let's Encrypt certificates (default)"
        echo "  self-signed  - Generate self-signed certificates"
        echo "  check        - Validate SSL configuration"
        echo "  renew        - Manually renew certificates"
        echo "  monitor      - Check certificate expiry"
        exit 1
        ;;
esac