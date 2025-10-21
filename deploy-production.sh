#!/bin/bash

# FluxStudio Production Deployment Script
# Automates the complete production deployment process

set -e  # Exit on any error

echo "🚀 FluxStudio Production Deployment"
echo "===================================="

# Configuration
DOMAIN="fluxstudio.art"
EMAIL="your_email@example.com"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_status "Docker is installed"

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_status "Docker Compose is installed"

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file is missing. Please create it first."
        exit 1
    fi
    print_status ".env.production file exists"

    # Check if required directories exist
    mkdir -p nginx/ssl logs uploads
    print_status "Required directories created"
}

# Backup existing data
backup_data() {
    echo "📦 Creating backup..."

    if [ -d "$BACKUP_DIR" ]; then
        rm -rf "$BACKUP_DIR"
    fi

    mkdir -p "$BACKUP_DIR"

    # Backup current database if exists
    if docker ps | grep -q "fluxstudio_postgres"; then
        print_status "Backing up database..."
        docker exec fluxstudio_postgres pg_dump -U fluxstudio fluxstudio > "$BACKUP_DIR/database.sql"
        print_status "Database backup completed"
    fi

    # Backup uploaded files
    if [ -d "./uploads" ]; then
        cp -r ./uploads "$BACKUP_DIR/"
        print_status "Files backup completed"
    fi

    print_status "Backup created at $BACKUP_DIR"
}

# Generate SSL certificates
setup_ssl() {
    echo "🔒 Setting up SSL certificates..."

    if [ ! -f "nginx/ssl/fullchain.pem" ]; then
        print_warning "SSL certificates not found. Setting up Let's Encrypt..."

        # Create temporary nginx config for initial certificate
        cp nginx/nginx.prod.conf nginx/nginx.temp.conf

        # Use certbot to get certificates
        docker run --rm -it \
            -v "$PWD/nginx/ssl:/etc/letsencrypt" \
            -v "$PWD/nginx/certbot:/var/www/certbot" \
            certbot/certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$EMAIL" \
            --agree-tos \
            --no-eff-email \
            -d "$DOMAIN" \
            -d "www.$DOMAIN"

        # Move certificates to nginx ssl directory
        cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
        cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
        cp /etc/letsencrypt/live/$DOMAIN/chain.pem nginx/ssl/

        print_status "SSL certificates generated"
    else
        print_status "SSL certificates already exist"
    fi

    # Generate DH parameters if not exists
    if [ ! -f "nginx/dhparam.pem" ]; then
        print_warning "Generating DH parameters (this may take a while)..."
        openssl dhparam -out nginx/dhparam.pem 2048
        print_status "DH parameters generated"
    fi
}

# Build and deploy services
deploy_services() {
    echo "🏗️ Building and deploying services..."

    # Stop existing services
    docker-compose -f docker-compose.prod.yml down

    # Build images
    print_status "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache

    # Start services
    print_status "Starting services..."
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for services to be healthy
    echo "⏳ Waiting for services to be ready..."
    sleep 30

    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    echo "🏥 Checking service health..."

    local services=("postgres" "redis" "auth-service" "messaging-service" "nginx")
    local all_healthy=true

    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*healthy"; then
            print_status "$service is healthy"
        else
            print_error "$service is not healthy"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = true ]; then
        print_status "All services are healthy"
    else
        print_error "Some services are not healthy. Check logs with: docker-compose -f docker-compose.prod.yml logs"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    echo "🗄️ Running database migrations..."

    # Wait for database to be ready
    sleep 10

    # Run migrations through auth service
    docker-compose -f docker-compose.prod.yml exec auth-service node -e "
        const { migrate } = require('./database/migrate');
        migrate().then(() => {
            console.log('Migrations completed successfully');
            process.exit(0);
        }).catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
    "

    print_status "Database migrations completed"
}

# Setup monitoring
setup_monitoring() {
    echo "📊 Setting up monitoring..."

    # Check if Grafana is accessible
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_status "Grafana is accessible"
    else
        print_warning "Grafana may not be ready yet"
    fi

    # Check if Prometheus is accessible
    if curl -f http://localhost:9090/-/healthy &> /dev/null; then
        print_status "Prometheus is accessible"
    else
        print_warning "Prometheus may not be ready yet"
    fi
}

# Verify deployment
verify_deployment() {
    echo "✅ Verifying deployment..."

    # Check if main site is accessible
    if curl -f https://$DOMAIN/health &> /dev/null; then
        print_status "Main site is accessible"
    else
        print_error "Main site is not accessible"
        return 1
    fi

    # Check API endpoints
    if curl -f https://$DOMAIN/api/auth/health &> /dev/null; then
        print_status "Auth API is accessible"
    else
        print_error "Auth API is not accessible"
        return 1
    fi

    if curl -f https://$DOMAIN/api/conversations/health &> /dev/null; then
        print_status "Messaging API is accessible"
    else
        print_error "Messaging API is not accessible"
        return 1
    fi

    print_status "Deployment verification completed successfully"
}

# Setup automatic renewal for SSL certificates
setup_ssl_renewal() {
    echo "🔄 Setting up SSL certificate auto-renewal..."

    # Create renewal script
    cat > ssl-renew.sh << 'EOF'
#!/bin/bash
docker run --rm -v "$PWD/nginx/ssl:/etc/letsencrypt" -v "$PWD/nginx/certbot:/var/www/certbot" certbot/certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
EOF

    chmod +x ssl-renew.sh

    # Add to crontab (runs twice daily)
    (crontab -l 2>/dev/null; echo "0 */12 * * * /path/to/fluxstudio/ssl-renew.sh") | crontab -

    print_status "SSL auto-renewal configured"
}

# Main deployment process
main() {
    echo "Starting FluxStudio production deployment..."

    check_prerequisites
    backup_data
    setup_ssl
    deploy_services
    run_migrations
    setup_monitoring
    verify_deployment
    setup_ssl_renewal

    echo ""
    echo "🎉 FluxStudio Production Deployment Complete!"
    echo "============================================="
    echo ""
    echo "🌐 Application: https://$DOMAIN"
    echo "📊 Monitoring: http://localhost:3000 (Grafana)"
    echo "📈 Metrics: http://localhost:9090 (Prometheus)"
    echo "📁 Backup: $BACKUP_DIR"
    echo ""
    echo "🔧 Useful commands:"
    echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  Restart: docker-compose -f docker-compose.prod.yml restart"
    echo "  Stop: docker-compose -f docker-compose.prod.yml down"
    echo ""
    print_status "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        backup_data
        ;;
    "ssl")
        setup_ssl
        ;;
    "health")
        check_service_health
        ;;
    "verify")
        verify_deployment
        ;;
    *)
        echo "Usage: $0 [deploy|backup|ssl|health|verify]"
        echo "  deploy  - Full production deployment (default)"
        echo "  backup  - Create backup only"
        echo "  ssl     - Setup SSL certificates only"
        echo "  health  - Check service health"
        echo "  verify  - Verify deployment"
        exit 1
        ;;
esac