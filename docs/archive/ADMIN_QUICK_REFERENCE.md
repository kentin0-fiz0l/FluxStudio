# FluxStudio Admin Dashboard - Quick Reference Card

**Version**: 1.0.0
**Last Updated**: 2025-10-15
**Access**: https://fluxstudio.art/admin

---

## 🔐 Login

**URL**: `https://fluxstudio.art/admin/login`

**Credentials**:
- Email: Your admin email
- Password: Your secure password

**Roles**:
- **Admin** (Level 3) - Full access to all features
- **Moderator** (Level 2) - Security management, read-only analytics
- **Analyst** (Level 1) - Read-only access to metrics and analytics

---

## 🏠 Dashboard

**Route**: `/admin/dashboard`

### Quick Stats
- **Blocked IPs** - Total IPs currently blocked
- **Active Tokens** - Valid authentication tokens
- **Security Events** - Events in last 24 hours
- **System Health** - Overall system status

### What You Can Do
- View real-time security metrics
- Monitor recent security events
- Check system health status
- Review performance summary (requests, latency, memory, CPU)

---

## 🚫 Blocked IPs Management

**Route**: `/admin/blocked-ips`
**Required Role**: Moderator (Level 2+)

### Features
- View all blocked IP addresses
- Filter by score range:
  - Critical (0-20)
  - High Risk (20-50)
  - Suspicious (50-80)
- Paginated list (20 IPs per page)

### Actions
1. **Unblock IP** - Reset score to 50 (neutral)
2. **Whitelist IP** - Set score to 100 (trusted)
   - Optional: Set duration (days)

### Color Codes
- 🟢 **Green** (80-100) - Trusted
- 🟡 **Yellow** (50-80) - Neutral/Suspicious
- 🟠 **Orange** (20-50) - High Risk
- 🔴 **Red** (0-20) - Blocked/Critical

---

## 🔑 Token Management

**Route**: `/admin/tokens`
**Required Role**: Moderator (Level 2+)

### Features
- Search tokens by email, user ID, or token ID
- Filter by status:
  - Active
  - Expired
  - Revoked
- View top 5 most active users
- Token statistics

### Actions
1. **Revoke Token** - Invalidate single token
   - Enter reason for revocation
2. **Revoke All** - Invalidate all user's tokens
   - Forces re-login for that user

### When to Revoke
- Suspicious activity detected
- User reports compromised account
- Employee termination
- Security policy violation

---

## 📋 Security Events

**Route**: `/admin/events`
**Required Role**: All

### Features
- Timeline view of all security events
- Filter by:
  - Event type (login, logout, failed_login, etc.)
  - Severity (critical, high, medium, low, info)
  - User ID
  - IP address
  - Date range (from/to)
- Export to JSON or CSV
- Event details modal

### Event Types
- `login` - Successful user login
- `logout` - User logout
- `failed_login` - Failed login attempt
- `unauthorized_access` - Access denied
- `ip_blocked` - IP address blocked
- `token_revoked` - Token manually revoked
- `admin_action` - Admin performed action

### Severity Levels
- 🔴 **CRITICAL** - Immediate attention required
- 🟠 **HIGH** - High priority security issue
- 🟡 **MEDIUM** - Moderate concern
- 🔵 **LOW/INFO** - Informational

---

## 📊 Performance Metrics

**Route**: `/admin/performance`
**Required Role**: All

### Features
- Real-time system metrics
- Auto-refresh toggle (30-second intervals)
- Time period selection (1h, 24h, 7d)
- System health monitoring

### Metrics Displayed
1. **Requests**
   - Total requests
   - Error rate (%)
   - Average per minute

2. **Latency**
   - Average latency (ms)
   - Max latency (ms)
   - P50, P95, P99 percentiles

3. **System Resources**
   - Memory usage (heap, RSS)
   - CPU usage (%)
   - System uptime

4. **Component Health**
   - Redis cache status
   - Database status
   - Service uptime

### Health Status Indicators
- 🟢 **Healthy** - All systems operational
- 🟡 **Degraded** - Minor issues, still functional
- 🔴 **Warning** - Critical issues, intervention needed

---

## ⚙️ Common Tasks

### Task 1: Unblock a User's IP
1. Go to **Blocked IPs**
2. Find the IP (or filter by score)
3. Click **Unblock** button
4. Confirm action

### Task 2: Revoke Suspicious Token
1. Go to **Tokens**
2. Search for user email or ID
3. Click **Revoke** on suspicious token
4. Enter reason (e.g., "Unusual login pattern")
5. Confirm

### Task 3: Export Security Events
1. Go to **Events**
2. Set filters (date range, severity, etc.)
3. Click **Export JSON** or **Export CSV**
4. File downloads automatically

### Task 4: Check System Health
1. Go to **Performance**
2. Review health status (top section)
3. Check component statuses:
   - Redis cache
   - Database
   - System resources
4. Review metrics graphs

### Task 5: Monitor Failed Logins
1. Go to **Events**
2. Filter by type: `failed_login`
3. Filter by severity: `high` or `medium`
4. Review timeline
5. Click event for details (IP, user agent, etc.)

---

## 🚨 Alert Responses

### High Failed Login Count
**What**: Multiple failed login attempts from same IP

**Action**:
1. Go to **Events** → Filter: `failed_login`
2. Note the IP address
3. Go to **Blocked IPs**
4. Check if IP is already blocked
5. If not, manually block (future feature)

### Token Compromise Suspected
**What**: Unusual token usage pattern

**Action**:
1. Go to **Tokens**
2. Search for user
3. Click **Revoke All** to force re-login
4. Enter reason: "Security precaution"
5. Contact user to verify

### System Performance Degraded
**What**: High latency or error rate

**Action**:
1. Go to **Performance**
2. Check system resources
3. Review endpoint performance table
4. Identify slow endpoints
5. Contact tech team with details

---

## 🔧 Troubleshooting

### Can't Login
- Verify email/password
- Check if account has admin role
- Try password reset (if available)
- Contact system administrator

### "Authentication Required" Error
- Token may have expired (7-day limit)
- Logout and login again
- Clear browser cache/cookies

### Dashboard Shows No Data
- Check internet connection
- Verify backend service is running
- Refresh page (F5 or Cmd+R)
- Check browser console for errors

### Slow Loading
- Check internet connection
- Check system performance dashboard
- Try during off-peak hours
- Contact support if persistent

---

## ⌨️ Keyboard Shortcuts

(Future enhancement - not yet implemented)

---

## 📱 Mobile Access

The admin dashboard is optimized for desktop use. Mobile access is limited but functional for viewing metrics and checking status.

**Recommended**: Use desktop/laptop for admin tasks

---

## 🔒 Security Best Practices

### Do's ✅
- ✅ Use strong, unique passwords
- ✅ Logout when done
- ✅ Monitor security events regularly
- ✅ Revoke suspicious tokens immediately
- ✅ Document reasons for actions
- ✅ Use HTTPS only
- ✅ Keep browser updated

### Don'ts ❌
- ❌ Share admin credentials
- ❌ Leave sessions unattended
- ❌ Use public WiFi for admin tasks
- ❌ Save passwords in browser
- ❌ Ignore security alerts
- ❌ Bypass security features

---

## 📞 Support

### Documentation
- Backend API: `SPRINT_13_DAY_5_COMPLETE.md`
- Frontend: `SPRINT_13_DAY_6_FINAL_COMPLETE.md`
- Deployment: `ADMIN_DEPLOYMENT_GUIDE.md`
- Sprint Summary: `SPRINT_13_COMPLETE.md`

### Emergency Contacts
- Technical Issues: [Dev Team Contact]
- Security Incidents: [Security Team Contact]
- General Support: [Support Email]

### System Status
- Backend Service: Check `/admin/performance`
- API Status: All endpoints listed in docs
- Maintenance Windows: [TBD]

---

## 📊 Quick Stats Reference

### Normal Operating Ranges
- **Request Error Rate**: < 1%
- **Average Latency**: < 500ms
- **P95 Latency**: < 1000ms
- **Memory Usage**: 50-150 MB
- **CPU Usage**: < 50%

### Alert Thresholds
- **Error Rate** > 5% - Investigate
- **Latency** > 2000ms - Check performance
- **Memory** > 500 MB - Possible memory leak
- **CPU** > 80% - High load

---

## 🎯 Quick Actions Reference

| I want to... | Go to | Action |
|--------------|-------|--------|
| Unblock an IP | Blocked IPs | Click Unblock |
| Revoke a token | Tokens | Search → Revoke |
| Export events | Events | Export JSON/CSV |
| Check health | Performance | View Health Status |
| Review failed logins | Events | Filter: failed_login |
| See active users | Tokens | View Top Users |
| Monitor system | Dashboard | View All Metrics |

---

## 📋 Daily Admin Checklist

### Morning ☀️
- [ ] Login to admin dashboard
- [ ] Check system health status
- [ ] Review overnight security events
- [ ] Check for critical alerts
- [ ] Review performance metrics

### During Day 🌤️
- [ ] Monitor security events as needed
- [ ] Respond to alerts
- [ ] Handle token revocations
- [ ] Unblock legitimate IPs

### Evening 🌙
- [ ] Review daily security summary
- [ ] Check system performance trends
- [ ] Note any anomalies for investigation
- [ ] Logout from admin dashboard

---

## 🏅 Admin Badge Meanings

**In Header**:
- 🔵 **Admin** - Full system access
- 🟡 **Moderator** - Security management
- 🟢 **Analyst** - Read-only analytics

---

**Quick Reference v1.0**
*FluxStudio Admin Dashboard*
*For questions: See full documentation*
