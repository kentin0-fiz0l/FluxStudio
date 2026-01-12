# FluxStudio Deployment Guide

This guide covers the automated deployment system for FluxStudio, ensuring ALL updates are reliably deployed to production with comprehensive safety checks.

## Quick Start

The easiest way to deploy is using the automated deployment script:

```bash
# Standard deployment (recommended)
npm run deploy

# Force deployment (skips safety checks)
npm run deploy:force

# Quick deployment (skips health checks)
npm run deploy:quick
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the application for production |
| `npm run deploy` | Full automated deployment with all safety checks |
| `npm run deploy:force` | Deploy even with uncommitted changes |
| `npm run deploy:quick` | Deploy without health checks |
| `npm run verify` | Verify current production deployment |
| `npm run health` | Run comprehensive health checks |
| `npm run clean` | Clean build artifacts |

## Deployment Process

### 1. Pre-deployment Checks
- Git repository status verification
- Uncommitted changes detection
- SSH connectivity to production server
- Dependencies verification (rsync, ssh)

### 2. Build Process
- Clean previous build artifacts
- Run production build with Vite
- Verify build output and essential files
- Generate deployment metadata
- Add cache-busting timestamps

### 3. Backup & Safety
- Create timestamped backup of current production
- Maintain rolling backup history (last 5 deployments)
- Automatic rollback capability on failure

### 4. Deployment
- Secure file transfer with rsync
- Atomic deployment process
- Exclude development files (.env, node_modules, etc.)
- Preserve production configurations

### 5. Verification & Health Checks
- File integrity verification
- Frontend loading tests
- Asset availability checks
- API connectivity verification
- Performance monitoring
- SSL certificate validation (if applicable)

### 6. Rollback (if needed)
- Automatic rollback on deployment failure
- Manual rollback capability
- Backup restoration with verification

## Configuration

### Environment Variables

Production configuration is managed in `.env.production`:

```bash
# Core Configuration
NODE_ENV=production
DEPLOYMENT_ENV=production
HEALTH_CHECK_URL=http://167.172.208.61

# API Configuration
VITE_API_BASE_URL=http://167.172.208.61:3001
VITE_SOCKET_URL=http://167.172.208.61:3001

# Build Configuration
VITE_BUILD_MODE=production
VITE_CACHE_BUSTING=true
VITE_MINIFY=true

# Security Configuration
SECURE_COOKIES=true
CSRF_PROTECTION=true
ENABLE_CORS=true
```

### Server Configuration

Production server details:
- **Server**: `root@167.172.208.61`
- **Path**: `/var/www/fluxstudio`
- **URL**: `http://167.172.208.61`
- **API**: `http://167.172.208.61:3001`

## Safety Features

### Git Integration
- Tracks commit hash and branch for each deployment
- Prevents deployment with uncommitted changes (unless forced)
- Maintains deployment history with Git integration

### Automatic Backup
- Creates compressed backup before each deployment
- Stores in `/var/www/fluxstudio/backups/`
- Keeps last 5 backups with automatic cleanup
- Enables instant rollback capability

### Health Monitoring
- Multi-layer health checks (frontend, API, assets)
- Performance monitoring (response times)
- SSL certificate verification
- Deployment integrity validation

### Error Recovery
- Automatic rollback on deployment failure
- Graceful error handling and logging
- Detailed failure reporting
- Manual recovery procedures

## Manual Deployment (Advanced)

If you need to deploy manually or customize the process:

### 1. Build Locally
```bash
npm run build
```

### 2. Deploy Files
```bash
rsync -avz --delete \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env.local \
  build/ root@167.172.208.61:/var/www/fluxstudio/
```

### 3. Verify Deployment
```bash
npm run verify
npm run health
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
- **Symptom**: `npm run build` fails
- **Solution**: Check for TypeScript errors, missing dependencies, or syntax issues
- **Command**: Review build logs and fix source code issues

#### 2. SSH Connection Issues
- **Symptom**: Cannot connect to production server
- **Solution**: Verify SSH keys and server accessibility
- **Command**: `ssh root@167.172.208.61 "echo 'Connection test'"`

#### 3. Permission Issues
- **Symptom**: Files cannot be written to production server
- **Solution**: Check server permissions and ownership
- **Command**: `ssh root@167.172.208.61 "ls -la /var/www/"`

#### 4. Health Check Failures
- **Symptom**: Health checks fail after deployment
- **Solution**: Check server logs and application status
- **Commands**:
  ```bash
  npm run health
  curl -I http://167.172.208.61
  ```

#### 5. Asset Loading Issues
- **Symptom**: Frontend loads but assets are missing
- **Solution**: Verify asset paths and cache settings
- **Command**: Check browser console for 404 errors

### Recovery Procedures

#### Rollback to Previous Version
```bash
# The deployment script automatically rolls back on failure
# For manual rollback:
ssh root@167.172.208.61 "cd /var/www/fluxstudio/backups && ls -la"
# Then restore specific backup if needed
```

#### Force Clean Deployment
```bash
npm run clean
npm run deploy:force
```

#### Reset Production Environment
```bash
# Only if absolutely necessary
ssh root@167.172.208.61 "rm -rf /var/www/fluxstudio/*"
npm run deploy:force
```

## Monitoring & Logs

### Deployment Logs
- Local logs: `deploy.log` (created during deployment)
- Server logs: `/var/www/fluxstudio/deployment.log`
- Health check logs: `/tmp/fluxstudio-health.log`

### Health Monitoring
```bash
# Quick health check
npm run health

# Detailed verification
npm run verify

# Manual URL check
curl -I http://167.172.208.61
```

### Performance Monitoring
- Response time monitoring
- Asset loading verification
- API connectivity checks
- SSL certificate validation

## Security Considerations

### Secrets Management
- Never commit real secrets to version control
- Use `.env.production` for production configuration
- Rotate credentials regularly
- Use SSH keys for server access

### Access Control
- Limit SSH access to deployment server
- Use principle of least privilege
- Monitor deployment logs for unauthorized access
- Regular security updates

### Data Protection
- Automated backups before each deployment
- Secure file transfer with rsync
- HTTPS enforcement (when available)
- Input validation and sanitization

## Production Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] Build completes without errors
- [ ] Environment variables are configured
- [ ] SSH access to production server works
- [ ] Backup space is available
- [ ] Recent backup exists
- [ ] Health check endpoints are accessible
- [ ] SSL certificates are valid (if applicable)
- [ ] Performance benchmarks are met
- [ ] Security scan completed

## Support & Maintenance

### Regular Maintenance
- Weekly backup verification
- Monthly security updates
- Quarterly performance reviews
- Annual infrastructure assessment

### Emergency Contacts
- **Technical Lead**: [Your Contact]
- **DevOps**: [Your Contact]
- **Server Admin**: [Your Contact]

### Documentation Updates
This documentation should be updated when:
- Server configuration changes
- New deployment features are added
- Security procedures are modified
- Performance requirements change

---

**Last Updated**: $(date +'%Y-%m-%d')
**Version**: 1.0
**Deployment System**: Automated with safety checks
**Production URL**: http://167.172.208.61