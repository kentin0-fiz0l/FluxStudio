# Security Best Practices

This document outlines security best practices for developing and deploying FluxStudio.

## Table of Contents

- [Environment Variables & Secrets](#environment-variables--secrets)
- [Authentication & Authorization](#authentication--authorization)
- [Input Validation](#input-validation)
- [Database Security](#database-security)
- [API Security](#api-security)
- [File Upload Security](#file-upload-security)
- [HTTPS & Transport Security](#https--transport-security)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [Monitoring & Logging](#monitoring--logging)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)

---

## Environment Variables & Secrets

### Do's

- **Use `.env` files for local development only**
- **Use secrets managers in production** (AWS Secrets Manager, Vault, etc.)
- **Generate strong secrets**: `openssl rand -hex 64`
- **Rotate secrets regularly** (every 90 days minimum)
- **Use different secrets per environment** (dev, staging, production)

### Don'ts

- **Never commit `.env` files** to version control
- **Never log secrets** in application logs
- **Never expose secrets** in client-side code
- **Never share secrets** via email, Slack, or chat

### Example: Secure Secret Generation

```bash
# Generate JWT secret (64 bytes)
openssl rand -hex 64

# Generate encryption key (32 bytes)
openssl rand -hex 32

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verifying No Secrets in Code

```bash
# Search for potential secrets in codebase
git secrets --scan
grep -r "sk_live\|sk_test\|password\s*=" --include="*.js" --include="*.ts"
```

---

## Authentication & Authorization

### JWT Best Practices

```javascript
// Good: Short expiration, secure signing
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  {
    expiresIn: '15m',      // Short-lived access tokens
    algorithm: 'HS256',
    issuer: 'fluxstudio',
    audience: 'fluxstudio-api'
  }
);

// Use refresh tokens for long sessions
const refreshToken = jwt.sign(
  { userId: user.id, tokenVersion: user.tokenVersion },
  process.env.REFRESH_TOKEN_SECRET,
  { expiresIn: '7d' }
);
```

### Password Requirements

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, special characters
- Check against common password lists
- Use bcrypt with cost factor 12+

```javascript
const bcrypt = require('bcryptjs');

// Hash password
const hash = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

### OAuth Security

- Validate OAuth state parameter to prevent CSRF
- Verify token signatures from providers
- Request minimum necessary scopes
- Implement proper token refresh handling

---

## Input Validation

### Server-Side Validation (Required)

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/projects',
  [
    body('name')
      .trim()
      .isLength({ min: 3, max: 100 })
      .escape(),
    body('email')
      .isEmail()
      .normalizeEmail(),
    body('url')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process valid input
  }
);
```

### Sanitization

```javascript
const sanitizeHtml = require('sanitize-html');

// Sanitize HTML content
const cleanHtml = sanitizeHtml(userInput, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p'],
  allowedAttributes: {
    'a': ['href']
  },
  allowedSchemes: ['http', 'https']
});
```

### SQL Injection Prevention

```javascript
// Good: Parameterized queries
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// Bad: String concatenation (NEVER do this)
// const result = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## Database Security

### Connection Security

```javascript
// Use SSL in production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt')
  } : false
});
```

### Access Control

- Use least privilege principle for database users
- Separate read and write database users if possible
- Enable row-level security where appropriate

### Data Protection

- Encrypt sensitive fields (PII, payment info)
- Use database-level encryption at rest
- Implement proper backup encryption

---

## API Security

### CORS Configuration

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  maxAge: 86400 // 24 hours
}));
```

### CSRF Protection

```javascript
const csrf = require('csurf');

// Enable CSRF for state-changing operations
app.use('/api', csrf({ cookie: true }));

// Include token in response
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### Request Size Limits

```javascript
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

---

## File Upload Security

### Validation

```javascript
const multer = require('multer');
const fileValidator = require('./lib/fileValidator');

const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }

    cb(null, true);
  }
});

// Validate file contents, not just extension
const validateFile = async (file) => {
  const fileType = await fileValidator.detectType(file.buffer);
  return fileType.mime === file.mimetype;
};
```

### Storage Security

- Store files outside webroot
- Use random filenames, not user-provided names
- Scan files for malware
- Serve files through authenticated endpoints

---

## HTTPS & Transport Security

### Force HTTPS

```javascript
// Redirect HTTP to HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### Secure Cookies

```javascript
app.use(session({
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

---

## Rate Limiting

### Configuration

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});

// Stricter limit for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
```

---

## Security Headers

### Helmet Configuration

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https://api.stripe.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Monitoring & Logging

### Security Event Logging

```javascript
const securityLogger = require('./lib/auth/securityLogger');

// Log authentication events
securityLogger.log({
  event: 'LOGIN_SUCCESS',
  userId: user.id,
  ip: req.ip,
  userAgent: req.get('User-Agent')
});

// Log suspicious activity
securityLogger.log({
  event: 'RATE_LIMIT_EXCEEDED',
  ip: req.ip,
  endpoint: req.path,
  severity: 'warning'
});
```

### What to Monitor

- Failed login attempts
- Password reset requests
- Permission changes
- Unusual API patterns
- File access patterns
- Admin actions

### Alerting

Set up alerts for:
- Multiple failed logins from same IP
- Successful logins from new locations
- Unusual data access patterns
- Rate limit violations

---

## Incident Response

### Response Steps

1. **Identify**: Detect and confirm the incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove the threat
4. **Recover**: Restore normal operations
5. **Learn**: Document and improve

### Contact

For security issues, contact: security@fluxstudio.art

**Do not** open public GitHub issues for security vulnerabilities.

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets are in environment variables
- [ ] `.env` files are in `.gitignore`
- [ ] HTTPS is enforced
- [ ] Security headers are configured
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] File upload validation working
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Dependencies audited (`npm audit`)
- [ ] Error messages don't leak sensitive info
- [ ] Logging is configured (without secrets)
- [ ] Monitoring alerts are set up

### Regular Maintenance

- [ ] Rotate secrets quarterly
- [ ] Update dependencies monthly
- [ ] Review access logs weekly
- [ ] Audit user permissions monthly
- [ ] Test backups monthly
- [ ] Review security alerts daily

---

## Audit History

| Date | Sprint | Report |
|------|--------|--------|
| 2026-02-24 | Sprint 49 | [SECURITY_AUDIT_S49.md](./SECURITY_AUDIT_S49.md) |

---

## Related Documentation

- [Environment Setup](./ENVIRONMENT_SETUP.md)
- [Architecture](./ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
