# FluxStudio Production Deployment Guide

This guide provides comprehensive instructions for deploying FluxStudio to production with full security, monitoring, and performance optimization.

## 🏗️ Architecture Overview

FluxStudio production deployment uses a containerized microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   SSL Termination│
│     (Nginx)     │────│   (Let's Encrypt)│
└─────────────────┘    └─────────────────┘
         │
┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │ Messaging Service│
│    (Node.js)    │    │    (Node.js)     │
└─────────────────┘    └─────────────────┘
         │                       │
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │
│   (Database)    │    │     (Cache)     │
└─────────────────┘    └─────────────────┘
         │
┌─────────────────┐    ┌─────────────────┐
│   Prometheus    │    │     Grafana     │
│   (Metrics)     │    │  (Dashboards)   │
└─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Docker and Docker Compose installed
- Domain name pointing to your server (e.g., fluxstudio.art)
- Server with at least 4GB RAM and 2 CPU cores
- Valid SSL certificate or Let's Encrypt setup

## 🚀 Quick Deployment

### 1. Environment Configuration

Copy and configure the production environment:

```bash
cp .env.production .env
```

Update the following critical values in `.env`:

```env
# Security - MUST CHANGE
JWT_SECRET=your_very_secure_jwt_secret_at_least_32_characters_long
POSTGRES_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_secure_redis_password
GRAFANA_ADMIN_PASSWORD=your_secure_grafana_password

# Domain configuration
DOMAIN=your-domain.com
CERTBOT_EMAIL=your-email@example.com

# OAuth (if using)
GOOGLE_CLIENT_SECRET=your_google_client_secret
APPLE_CLIENT_SECRET=your_apple_client_secret

# Email configuration
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

### 2. SSL Certificate Setup

For production with Let's Encrypt:

```bash
# Setup SSL certificates
./security/ssl-setup.sh production
```

For development/testing:

```bash
# Generate self-signed certificates
./security/ssl-setup.sh development
```

### 3. Full Deployment

Run the complete deployment:

```bash
# Make deployment script executable
chmod +x deploy-production.sh

# Deploy to production
./deploy-production.sh
```

### 4. Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Build and start services
docker-compose -f docker-compose.prod.yml up --build -d

# 2. Wait for services to be ready (30-60 seconds)
docker-compose -f docker-compose.prod.yml ps

# 3. Run database migrations
docker-compose -f docker-compose.prod.yml exec auth-service npm run migrate

# 4. Verify deployment
curl https://your-domain.com/health
```

## 🔧 Configuration Details

### Security Configuration

The production deployment includes:

- **SSL/TLS**: Automatic HTTPS redirect and strong encryption
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting**: API and authentication rate limits
- **Input Validation**: SQL injection and XSS protection
- **Suspicious Activity Detection**: Automated threat detection

### Monitoring Stack

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards
- **Loki**: Log aggregation and analysis
- **Promtail**: Log collection agent
- **Node Exporter**: System metrics

### Database Configuration

- **PostgreSQL**: Primary data storage with connection pooling
- **Redis**: Session storage and caching
- **Automated Backups**: Daily database backups
- **Performance Monitoring**: Query performance tracking

## 📊 Monitoring and Alerting

### Access Monitoring Dashboards

After deployment, access these monitoring interfaces:

- **Application**: https://your-domain.com
- **Grafana**: http://your-server:3000
- **Prometheus**: http://your-server:9090

### Key Alerts

The system monitors and alerts on:

- Service downtime
- High error rates (>10%)
- Performance degradation
- Security threats
- SSL certificate expiry
- Resource exhaustion

### Dashboard Overview

Grafana dashboards include:

1. **FluxStudio Overview**: Key application metrics
2. **System Performance**: CPU, memory, disk usage
3. **Database Performance**: Query times, connections
4. **Security Dashboard**: Failed logins, suspicious activity
5. **User Analytics**: Activity patterns, growth metrics

## 🔐 Security Features

### SSL/TLS

- **Let's Encrypt**: Automatic certificate renewal
- **HSTS**: HTTP Strict Transport Security
- **Perfect Forward Secrecy**: DHE and ECDHE cipher suites
- **Certificate Monitoring**: Automatic expiry alerts

### Application Security

- **Authentication**: JWT-based with secure session management
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive sanitization
- **Rate Limiting**: Multiple tiers (general, auth, file upload)
- **CORS**: Configured for production domains only

### Infrastructure Security

- **Container Security**: Non-root users, minimal attack surface
- **Network Isolation**: Docker network segmentation
- **Secret Management**: Environment variable based
- **Security Monitoring**: Real-time threat detection

## 🔄 Maintenance Operations

### Regular Maintenance

```bash
# View service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Update application
git pull
docker-compose -f docker-compose.prod.yml up --build -d
```

### Backup Operations

```bash
# Create manual backup
./deploy-production.sh backup

# Database backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U fluxstudio fluxstudio > backup-$(date +%Y%m%d).sql
```

### SSL Certificate Management

```bash
# Check certificate status
./security/ssl-setup.sh check

# Manual renewal
./security/ssl-setup.sh renew

# Monitor expiry
./security/ssl-setup.sh monitor
```

## 📈 Performance Optimization

### Load Testing

Before going live, run load tests:

```bash
# Run performance tests
cd tests/load
node performance.load.test.js

# Run full test suite
cd ../..
node tests/run-all-tests.js --security
```

### Scaling Considerations

For high-traffic deployments:

1. **Horizontal Scaling**: Add more service instances
2. **Database Scaling**: Read replicas for PostgreSQL
3. **Caching**: Redis clustering
4. **CDN**: Static asset delivery
5. **Load Balancing**: Multiple Nginx instances

### Performance Thresholds

Monitor these key metrics:

- **API Response Time**: < 500ms (95th percentile)
- **Database Query Time**: < 100ms average
- **WebSocket Latency**: < 100ms
- **Memory Usage**: < 80%
- **CPU Usage**: < 80%

## 🚨 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
docker-compose -f docker-compose.prod.yml logs
```

**SSL certificate issues:**
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Test SSL configuration
curl -I https://your-domain.com
```

**Database connection errors:**
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from app
docker-compose -f docker-compose.prod.yml exec auth-service node -e "
  const { pool } = require('./database/config');
  pool.query('SELECT NOW()').then(console.log).catch(console.error);
"
```

### Health Checks

```bash
# Application health
curl https://your-domain.com/health

# Service-specific health
curl https://your-domain.com/api/auth/health
curl https://your-domain.com/api/conversations/health

# Monitoring health
curl http://your-server:9090/-/healthy  # Prometheus
curl http://your-server:3000/api/health  # Grafana
```

## 📞 Support and Monitoring

### Log Locations

- Application logs: `./logs/`
- Container logs: `docker-compose logs`
- System logs: `/var/log/`
- Security logs: `./logs/security-*.log`

### Monitoring Contacts

Configure alert notifications in:
- `monitoring/alert_rules.yml`: Alert definitions
- Grafana notification channels: Email, Slack, PagerDuty

### Performance Baselines

Expected performance metrics:

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| API Response Time | < 200ms | > 500ms |
| Database Queries | < 50ms | > 100ms |
| WebSocket Latency | < 50ms | > 100ms |
| Error Rate | < 1% | > 5% |
| Uptime | > 99.9% | < 99% |

## 🎯 Next Steps

After successful deployment:

1. **DNS Configuration**: Point your domain to the server
2. **Monitoring Setup**: Configure alert notifications
3. **User Testing**: Validate all features work correctly
4. **Performance Testing**: Run load tests under expected traffic
5. **Backup Verification**: Test backup and restore procedures
6. **Security Audit**: Run security scans and penetration tests

---

## 📄 Files Created

This deployment creates the following production infrastructure:

- `docker-compose.prod.yml`: Production container orchestration
- `Dockerfile.auth`: Auth service container
- `Dockerfile.messaging`: Messaging service container
- `nginx/nginx.prod.conf`: Production web server configuration
- `security/ssl-setup.sh`: SSL certificate management
- `security/security-hardening.js`: Security middleware
- `monitoring/`: Complete monitoring stack configuration
- `deploy-production.sh`: Automated deployment script

**Status: Production Ready** 🎉

For questions or issues, check the logs first, then consult the troubleshooting section above.