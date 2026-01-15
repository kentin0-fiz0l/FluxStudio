# FluxStudio Troubleshooting Guide

## Common Issues & Solutions

### Frontend Issues

#### Build Failures

**Symptom**: `npm run build` fails

**Solutions**:
1. Clear cache and reinstall
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. Check Node version
   ```bash
   node --version  # Should be 18+ or 20+
   ```

3. Check for TypeScript errors
   ```bash
   npm run typecheck
   ```

#### Assets Not Loading

**Symptom**: Images, fonts, or styles missing

**Solutions**:
1. Verify environment variables
   ```bash
   echo $VITE_API_BASE_URL
   echo $VITE_APP_URL
   ```

2. Check browser console for 404s

3. Clear CDN cache (if applicable)

#### White Screen / App Not Rendering

**Symptom**: Blank page with no errors

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify React root element exists
3. Check if index.html is being served correctly

### Backend Issues

#### Database Connection Failed

**Symptom**: `ECONNREFUSED` or timeout errors

**Solutions**:
1. Verify DATABASE_URL format
   ```
   postgresql://user:pass@host:port/database?sslmode=require
   ```

2. Check if database is accessible
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. Verify SSL settings
   - Production: `sslmode=require`
   - Local: `sslmode=disable`

4. Check connection pool settings
   ```javascript
   // lib/db.js - adjust pool size
   max: 10,
   idleTimeoutMillis: 30000
   ```

#### Redis Connection Failed

**Symptom**: Cache errors or session issues

**Solutions**:
1. Verify REDIS_URL format
   ```
   rediss://default:password@host:port
   ```

2. Check if Redis is accessible
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

3. Application falls back gracefully without Redis

#### JWT/Authentication Errors

**Symptom**: 401 errors, "Invalid token"

**Solutions**:
1. Verify JWT_SECRET is set
   ```bash
   echo $JWT_SECRET  # Should not be empty
   ```

2. Check token format
   ```bash
   # Decode JWT payload (base64)
   echo "TOKEN_HERE" | cut -d'.' -f2 | base64 -d
   ```

3. Verify token hasn't expired

#### CORS Errors

**Symptom**: "Access-Control-Allow-Origin" errors

**Solutions**:
1. Verify CORS_ORIGINS includes the requesting domain
   ```bash
   echo $CORS_ORIGINS
   # Should include: https://fluxstudio.art,https://www.fluxstudio.art
   ```

2. Check request origin matches exactly

3. For WebSocket, check `allowCredentials` setting

### WebSocket Issues

#### Connection Refused

**Symptom**: Socket.IO can't connect

**Solutions**:
1. Verify WebSocket URL
   ```javascript
   // Should be wss:// for production
   const socket = io('wss://fluxstudio.art');
   ```

2. Check if collaboration service is running
   ```bash
   curl https://fluxstudio.art/collab/health
   ```

3. Verify CORS allows WebSocket upgrade

#### Messages Not Syncing

**Symptom**: Real-time updates delayed or missing

**Solutions**:
1. Check client connection status
   ```javascript
   socket.on('connect', () => console.log('Connected'));
   socket.on('disconnect', () => console.log('Disconnected'));
   ```

2. Verify room/channel subscription

3. Check Redis pub/sub is working (if used)

### OAuth Issues

#### Google OAuth Failed

**Symptom**: "Invalid client" or redirect errors

**Solutions**:
1. Verify client ID matches in:
   - DigitalOcean environment
   - Google Cloud Console
   - Frontend VITE_GOOGLE_CLIENT_ID

2. Check authorized redirect URIs in Google Console:
   ```
   https://fluxstudio.art/api/auth/google/callback
   ```

3. Verify GOOGLE_CLIENT_SECRET is set correctly

#### GitHub OAuth Failed

**Symptom**: OAuth callback errors

**Solutions**:
1. Check GitHub OAuth app settings
2. Verify callback URL matches
3. Check rate limits (5000 requests/hour)

### File Upload Issues

#### Upload Fails / Times Out

**Symptom**: Large file uploads fail

**Solutions**:
1. Check MAX_FILE_SIZE setting
   ```bash
   echo $MAX_FILE_SIZE  # Default: 52428800 (50MB)
   ```

2. Verify upload directory exists and is writable
   ```bash
   ls -la $UPLOAD_DIR
   ```

3. Check for timeout settings in reverse proxy

#### S3/Spaces Upload Failed

**Symptom**: "Access Denied" or "Invalid credentials"

**Solutions**:
1. Verify Spaces credentials
   ```bash
   echo $SPACES_ACCESS_KEY
   echo $SPACES_SECRET_KEY
   ```

2. Check bucket permissions

3. Verify endpoint and region match

### Performance Issues

#### Slow Response Times

**Symptom**: API responses > 500ms

**Solutions**:
1. Check database query performance
   ```sql
   EXPLAIN ANALYZE SELECT * FROM ...;
   ```

2. Add database indexes if needed

3. Review N+1 query patterns

4. Enable query logging to identify slow queries

#### Memory Leaks

**Symptom**: Gradual memory increase, eventual OOM

**Solutions**:
1. Monitor memory usage
   ```bash
   curl https://fluxstudio.art/api/monitoring/metrics | jq .memory
   ```

2. Check for:
   - Unclosed database connections
   - Event listener accumulation
   - Large object caching

3. Add heap snapshots in development

#### High CPU Usage

**Symptom**: CPU > 80% sustained

**Solutions**:
1. Profile hot paths
2. Check for infinite loops
3. Optimize heavy computations
4. Consider scaling horizontally

### Deployment Issues

#### Health Check Failures

**Symptom**: Deployment fails with health check timeout

**Solutions**:
1. Increase `initial_delay_seconds` in app.yaml
2. Check if app starts correctly locally
3. Review startup logs for errors
4. Verify PORT environment variable

#### Build Out of Memory

**Symptom**: Build fails with memory errors

**Solutions**:
1. Increase Node memory limit
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

2. Split build into smaller chunks
3. Review dependencies size

### Local Development Issues

#### Port Already in Use

**Symptom**: `EADDRINUSE` error

**Solutions**:
1. Kill existing process
   ```bash
   lsof -i :3001 | awk 'NR>1 {print $2}' | xargs kill
   ```

2. Use different port
   ```bash
   PORT=3002 npm run dev:unified
   ```

#### Missing Dependencies

**Symptom**: Module not found errors

**Solutions**:
1. Reinstall dependencies
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Check peer dependencies

3. Verify correct Node version

## Diagnostic Commands

### Quick Health Check
```bash
#!/bin/bash
echo "=== FluxStudio Health Check ==="
for endpoint in "/" "/api/health" "/collab/health"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "https://fluxstudio.art$endpoint")
  echo "$endpoint: $status"
done
```

### Database Connection Test
```bash
psql $DATABASE_URL -c "
  SELECT
    (SELECT count(*) FROM users) as users,
    (SELECT count(*) FROM projects) as projects,
    (SELECT count(*) FROM organizations) as orgs;
"
```

### Log Analysis
```bash
# Find errors in logs
doctl apps logs <app-id> --type=run | grep -i "error\|exception\|failed"

# Count error types
doctl apps logs <app-id> --type=run | grep -oP 'Error: \K[^:]+' | sort | uniq -c | sort -rn
```

## Getting Help

1. Check this guide first
2. Search existing GitHub issues
3. Review recent deployments for changes
4. Contact team via #engineering channel

## Log Locations

| Environment | Location |
|-------------|----------|
| Production | DigitalOcean dashboard > Apps > Logs |
| Local | Console output / `logs/` directory |

## Useful Links

- [DigitalOcean Status](https://status.digitalocean.com)
- [GitHub Actions](https://github.com/kentin0-fiz0l/FluxStudio/actions)
- [Monitoring Dashboard](https://fluxstudio.art/api/monitoring)
