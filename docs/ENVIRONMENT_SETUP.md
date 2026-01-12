# Environment Setup Guide

This guide explains how to configure environment variables for FluxStudio development and production deployments.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Generate secure secrets:
   ```bash
   # Generate JWT secret
   openssl rand -hex 64

   # Generate session secret
   openssl rand -hex 32
   ```

3. Update `.env` with your values and start development:
   ```bash
   npm run dev:all
   ```

---

## Environment Variables Reference

### Application Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode: `development`, `production`, `test` |
| `APP_NAME` | No | `FluxStudio` | Application name for logging and display |
| `APP_URL` | No | `http://localhost:3000` | Public URL of the application |

### Server Ports

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Main backend server port (unified auth + API) |
| `MESSAGING_PORT` | No | `3004` | WebSocket messaging server port |
| `VITE_PORT` | No | `5173` | Frontend dev server port (Vite) |

### Security (Critical)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | Auto-generated | Secret key for JWT signing (min 64 chars) |
| `JWT_EXPIRES_IN` | No | `24h` | JWT token expiration time |
| `SESSION_SECRET` | No | Auto-generated | Express session secret |
| `ENCRYPTION_KEY` | No | Auto-generated | Data encryption key (32 bytes hex) |

> **Warning**: In production, always set `JWT_SECRET` explicitly. Never use auto-generated secrets in production.

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `AUTH_RATE_LIMIT_MAX` | No | `5` | Max auth attempts per window |

### CORS Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:5173,https://fluxstudio.art` | Comma-separated allowed origins |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** (prod) | - | PostgreSQL connection string |
| `REDIS_URL` | No | - | Redis connection URL for caching |
| `DB_SSL` | No | `false` | Enable SSL for database connection |

**PostgreSQL URL Format:**
```
postgresql://username:password@host:5432/database_name?sslmode=require
```

### OAuth Providers

#### Google OAuth
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth client secret |

#### Apple Sign-In
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APPLE_CLIENT_ID` | No | - | Apple Services ID |
| `APPLE_TEAM_ID` | No | - | Apple Developer Team ID |
| `APPLE_KEY_ID` | No | - | Apple private key ID |
| `APPLE_PRIVATE_KEY` | No | - | Apple private key (PEM format) |

### File Storage

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `UPLOAD_DIR` | No | `./uploads` | Local upload directory |
| `MAX_FILE_SIZE` | No | `52428800` (50MB) | Maximum file upload size in bytes |
| `AWS_ACCESS_KEY_ID` | No | - | AWS access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | No | - | AWS secret key for S3 |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `S3_BUCKET` | No | - | S3 bucket name for file storage |

### Email (SMTP)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | No | - | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `EMAIL_FROM` | No | `noreply@fluxstudio.art` | Default sender email address |

### External Services

#### Stripe (Payments)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | No | - | Stripe secret API key |
| `STRIPE_PUBLISHABLE_KEY` | No | - | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | No | - | Stripe webhook signing secret |

#### Sentry (Error Monitoring)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | - | Sentry Data Source Name |

#### Slack Integration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_CLIENT_ID` | No | - | Slack app client ID |
| `SLACK_CLIENT_SECRET` | No | - | Slack app client secret |
| `SLACK_SIGNING_SECRET` | No | - | Slack request signing secret |

#### Figma Integration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIGMA_CLIENT_ID` | No | - | Figma app client ID |
| `FIGMA_CLIENT_SECRET` | No | - | Figma app client secret |

#### GitHub Integration
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_CLIENT_ID` | No | - | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | No | - | GitHub OAuth app client secret |

### Monitoring & Logging

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `LOG_DIR` | No | `./logs` | Directory for log files |

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_REGISTRATION` | No | `true` | Enable user registration |
| `ENABLE_OAUTH` | No | `true` | Enable OAuth authentication |
| `ENABLE_FILE_UPLOAD` | No | `true` | Enable file uploads |
| `ENABLE_WEBSOCKET` | No | `true` | Enable WebSocket connections |
| `MAINTENANCE_MODE` | No | `false` | Enable maintenance mode |
| `MAINTENANCE_MESSAGE` | No | (default message) | Custom maintenance message |

---

## Environment-Specific Configuration

### Development (.env)

```bash
NODE_ENV=development
APP_URL=http://localhost:3000

# Ports
PORT=3001
VITE_PORT=5173

# Security (auto-generated in dev, but set for consistency)
JWT_SECRET=your-development-jwt-secret-minimum-64-characters-long-here
JWT_EXPIRES_IN=24h

# Database (local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fluxstudio_dev

# CORS (allow local development)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Feature flags
ENABLE_REGISTRATION=true
ENABLE_OAUTH=true
```

### Production (.env.production)

```bash
NODE_ENV=production
APP_URL=https://fluxstudio.art

# Security (MUST be unique and secure)
JWT_SECRET=<generate-with-openssl-rand-hex-64>
SESSION_SECRET=<generate-with-openssl-rand-hex-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>

# Database (production PostgreSQL with SSL)
DATABASE_URL=postgresql://user:password@db.example.com:5432/fluxstudio?sslmode=require
DB_SSL=true

# Redis (for caching and sessions)
REDIS_URL=redis://user:password@redis.example.com:6379

# CORS (production domains only)
CORS_ORIGINS=https://fluxstudio.art,https://www.fluxstudio.art

# Rate limiting (stricter in production)
RATE_LIMIT_MAX_REQUESTS=50
AUTH_RATE_LIMIT_MAX=3

# Error monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>

# File storage (AWS S3)
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
S3_BUCKET=fluxstudio-production

# Payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Testing (.env.test)

```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fluxstudio_test
JWT_SECRET=test-jwt-secret-for-testing-purposes-only-not-for-production
ENABLE_REGISTRATION=true
```

---

## Security Best Practices

1. **Never commit `.env` files** - They are in `.gitignore` by default
2. **Use strong secrets** - Generate with `openssl rand -hex 64`
3. **Rotate secrets regularly** - Especially after team member changes
4. **Use environment-specific files** - Don't use dev secrets in production
5. **Validate on startup** - The app validates required variables automatically
6. **Use secret managers** - Consider AWS Secrets Manager, Vault, or similar in production

---

## Troubleshooting

### "Missing JWT_SECRET" Warning
The app auto-generates a secret in development but warns you. Set it explicitly:
```bash
JWT_SECRET=$(openssl rand -hex 64)
```

### Database Connection Failed
1. Check `DATABASE_URL` format
2. Verify PostgreSQL is running
3. Check network/firewall settings
4. For SSL issues, try `?sslmode=disable` in development

### CORS Errors
Add your frontend URL to `CORS_ORIGINS`:
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-domain.com
```

### OAuth Not Working
1. Verify client ID and secret are correct
2. Check redirect URIs in provider console
3. Ensure `ENABLE_OAUTH=true`

---

## Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Security Best Practices](./SECURITY.md)
- [Deployment Guide](./DEPLOYMENT.md)
