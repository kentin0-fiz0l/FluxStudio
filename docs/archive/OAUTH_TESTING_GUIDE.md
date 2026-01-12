# OAuth Integration Testing Guide

**Ready for Testing:** October 17, 2025
**Environment:** Production (https://fluxstudio.art)

---

## 🎯 Quick Start

The OAuth integrations are **LIVE** and ready for testing! Here's how to test them:

### Prerequisites
- ✅ Figma account (free or paid)
- ✅ Slack workspace (admin access recommended)
- ✅ FluxStudio account at https://fluxstudio.art

### Access the Integrations

1. **Log in to FluxStudio**
   ```
   URL: https://fluxstudio.art
   Email: your-email@example.com
   Password: your-password
   ```

2. **Navigate to Settings**
   - Click your profile icon (top right)
   - Select "Settings" from dropdown
   - OR directly visit: https://fluxstudio.art/settings

3. **Scroll to Integrations Section**
   - You'll see two cards: **Figma** and **Slack**
   - Each shows connection status and features

---

## 🎨 Testing Figma Integration

### Configuration Status
- ✅ OAuth Credentials: Configured
- ✅ Redirect URL: https://fluxstudio.art/api/integrations/figma/callback
- ✅ Backend Endpoints: Live
- ✅ Frontend UI: Deployed
- ✅ Database Tables: Created

### Test Flow

#### 1. Connect Figma

**Desktop:**
1. Click **"Connect Figma"** button
2. A popup window opens (600x700px, centered)
3. Figma login page appears in popup
4. Enter your Figma credentials
5. Click **"Allow access"**
6. Popup closes automatically
7. Settings page shows **"Connected"** status

**Mobile:**
1. Click **"Connect Figma"** button
2. Redirected to Figma in same window
3. Login and authorize
4. Redirected back to Settings
5. Shows **"Connected"** status

#### 2. Browse Figma Files

Once connected:
1. Integration card shows your Figma account info
2. Click **"Refresh"** to load files
3. Recent files appear (up to 5 shown)
4. Each file shows:
   - Thumbnail (if available)
   - File name
   - Last modified date
5. Click any file to open in Figma

#### 3. Disconnect Figma

1. Click **"Disconnect"** button
2. Confirmation dialog appears explaining:
   - ❌ Features that will stop working
   - ✅ Data that will remain
   - ℹ️ You can reconnect anytime
3. Click **"Disconnect"** to confirm
4. Status returns to **"Not connected"**

### Expected Behavior

**✅ Success States:**
- Green checkmark + "Connected" text
- Figma account email displayed
- File list loads within 2-3 seconds
- Files clickable and open in new tab

**⚠️ Warning States:**
- Yellow banner if token expires in <7 days
- "Reconnect Now" button appears

**❌ Error States:**
- Red error banner for failed connection
- "Try Again" button to retry
- Specific error messages:
  - "Popup blocked" → Instructions to allow popups
  - "Authorization denied" → User cancelled
  - "Network error" → Check internet connection

---

## 💬 Testing Slack Integration

### Configuration Status
- ✅ OAuth Credentials: Configured
- ✅ Redirect URL: https://fluxstudio.art/api/integrations/slack/callback
- ✅ Bot Scopes: All 6 scopes added
- ✅ Backend Endpoints: Live
- ✅ Frontend UI: Deployed
- ✅ Multi-workspace: Supported (up to 5)

### Test Flow

#### 1. Connect Slack

**Desktop:**
1. Click **"Connect Slack"** button
2. Popup window opens showing Slack workspaces
3. Select a workspace
4. Click **"Allow"** to grant permissions
5. Popup closes
6. Settings shows **"Connected"** status

**Mobile:**
1. Click **"Connect Slack"** button
2. Redirected to Slack in same window
3. Select workspace and authorize
4. Redirected back to Settings
5. Shows **"Connected"** status

#### 2. Browse Channels

Once connected:
1. Workspace name and icon displayed
2. Click **"Refresh"** to load channels
3. Channel list appears showing:
   - # icon for public channels
   - Channel name
   - "Private" label (if private)
   - Member count
4. Up to 10 channels shown initially
5. Total count shown if more than 10

#### 3. Connect Multiple Workspaces

1. While connected to one workspace
2. Click **"Connect Slack"** again
3. Select a different workspace
4. Both workspaces appear in list
5. Click workspace to switch
6. Channels update for selected workspace
7. Maximum of 5 workspaces supported

#### 4. Disconnect Slack

1. Click **"Disconnect"** button
2. Confirmation dialog shows impact
3. Click **"Disconnect"** to confirm
4. **All workspaces** disconnect
5. Status returns to **"Not connected"**

### Expected Behavior

**✅ Success States:**
- Green checkmark + "Connected"
- Workspace icon and name
- Channel list with accurate data
- Smooth workspace switching

**📊 Multi-Workspace:**
- Up to 5 workspaces connectable
- Workspace selector UI appears
- Last used timestamp shown
- Each workspace has own channels

**❌ Error States:**
- Red banner for failures
- "Try Again" button
- Specific error messages

---

## 🧪 Test Scenarios

### Scenario 1: First-Time Connection
**Goal:** Verify fresh OAuth flow works

1. Ensure you're not connected
2. Click "Connect [Figma/Slack]"
3. Complete authorization
4. Verify "Connected" status
5. Verify data loads (files/channels)

**Expected:** ✅ Smooth flow, <5 seconds total

---

### Scenario 2: Popup Blocker
**Goal:** Test fallback when popup blocked

1. Block popups in browser settings
2. Click "Connect [Figma/Slack]"
3. Observe error message
4. Follow instructions to allow popups
5. Click "Try Again"
6. Complete authorization

**Expected:** ⚠️ Clear error message + retry option

---

### Scenario 3: User Denies Authorization
**Goal:** Test error handling for denial

1. Click "Connect [Figma/Slack]"
2. In popup, click "Cancel" or "Deny"
3. Observe error state

**Expected:** ❌ "Authorization denied" message + retry

---

### Scenario 4: Network Interruption
**Goal:** Test network error handling

1. Start connection process
2. Disable internet mid-flow
3. Observe error

**Expected:** ❌ "Network error" message + retry

---

### Scenario 5: Disconnect & Reconnect
**Goal:** Verify cleanup and re-connection

1. Connect integration
2. Disconnect with confirmation
3. Verify data cleared
4. Reconnect
5. Verify fresh connection

**Expected:** ✅ Clean state transitions

---

### Scenario 6: Mobile Testing
**Goal:** Verify mobile-specific flow

1. Open on mobile device
2. Click "Connect"
3. Note same-window redirect
4. Complete auth
5. Return to FluxStudio
6. Verify connection

**Expected:** ✅ Mobile-optimized flow works

---

### Scenario 7: Accessibility
**Goal:** Test keyboard & screen reader

1. Navigate with Tab key only
2. Activate with Enter/Space
3. Verify focus indicators
4. Test with screen reader
5. Check announcements

**Expected:** ✅ WCAG 2.1 AA compliant

---

## 🔍 What to Look For

### UI/UX Checklist

- [ ] **Status Indicators**
  - Connected: Green checkmark visible
  - Disconnected: Gray dot visible
  - Connecting: Spinner animating
  - Error: Red X with message

- [ ] **Loading States**
  - Button shows "Connecting..." text
  - Spinner appears during auth
  - Overlay prevents multiple clicks
  - Status announces to screen readers

- [ ] **Error Messages**
  - User-friendly language
  - Actionable instructions
  - "Try Again" button visible
  - "Dismiss" button available

- [ ] **Confirmation Dialogs**
  - Shows before disconnect
  - Lists consequences clearly
  - "Cancel" button available
  - Red "Disconnect" button

- [ ] **Data Display**
  - Files/channels load correctly
  - Thumbnails/icons render
  - Timestamps formatted well
  - Truncation for long names

### Technical Checklist

- [ ] **OAuth Flow**
  - Popup opens centered
  - HTTPS connection secure
  - State token in URL
  - Callback completes

- [ ] **Database Persistence**
  - Token saved after auth
  - Integration listed in /api/integrations
  - Survives page refresh
  - Cleaned up after disconnect

- [ ] **API Endpoints**
  - GET /api/integrations returns 200
  - GET /api/integrations/[provider]/auth returns authorizationUrl
  - DELETE /api/integrations/[provider] returns 200
  - Figma: GET /api/integrations/figma/files works
  - Slack: GET /api/integrations/slack/channels works

- [ ] **Security**
  - Tokens encrypted at rest
  - HTTPS only
  - CSRF protection active
  - No credentials in URLs

---

## 📊 Database Verification

### Check Integration in Database

SSH to server and run:

```bash
ssh root@167.172.208.61
sudo -u postgres psql -d fluxstudio

-- View your integrations
SELECT provider, status, connected_at
FROM oauth_tokens
WHERE user_id = 'your-user-id';

-- Check state tokens (should expire after 15 min)
SELECT provider, expires_at
FROM oauth_state_tokens
WHERE user_id = 'your-user-id';

-- View cached data
SELECT * FROM figma_files_cache LIMIT 5;
SELECT * FROM slack_channels_cache LIMIT 5;
```

**Expected:**
- Tokens present after connection
- Status = 'active'
- Encrypted access_token
- Expiration dates set

---

## 🐛 Troubleshooting

### Issue: Popup Doesn't Open

**Symptoms:** Nothing happens when clicking "Connect"

**Solutions:**
1. Check browser console for errors
2. Allow popups for fluxstudio.art
3. Disable popup blockers temporarily
4. Try different browser

---

### Issue: "Authorization Failed" Error

**Symptoms:** Red error after OAuth

**Solutions:**
1. Check redirect URL in Figma/Slack app settings
2. Verify credentials in server .env
3. Check server logs: `ssh root@167.172.208.61 "pm2 logs flux-auth"`
4. Retry connection

---

### Issue: Files/Channels Don't Load

**Symptoms:** "No files found" or empty channel list

**Solutions:**
1. Ensure you have files/channels
2. Check you granted correct permissions
3. Click "Refresh" button
4. Check network tab for API errors
5. Verify OAuth scopes in app settings

---

### Issue: Connection Shows as Expired

**Symptoms:** Yellow warning banner

**Solutions:**
1. Click "Reconnect Now" button
2. Complete auth flow again
3. New token issued automatically

---

## 📝 Reporting Issues

If you encounter any issues during testing, please report:

### Information to Include

1. **Browser & Device**
   - Browser name and version
   - Desktop/mobile
   - Operating system

2. **Steps to Reproduce**
   - Exact steps taken
   - What you clicked
   - When error occurred

3. **Screenshots**
   - Error messages
   - Console errors (F12 → Console)
   - Network tab if API error

4. **Expected vs Actual**
   - What you expected to happen
   - What actually happened

5. **Server Logs** (if available)
   ```bash
   ssh root@167.172.208.61 "pm2 logs flux-auth --lines 50"
   ```

---

## ✅ Testing Complete Checklist

After testing, verify:

- [ ] Figma connection works on desktop
- [ ] Figma connection works on mobile
- [ ] Figma file browser loads
- [ ] Figma disconnect works
- [ ] Slack connection works on desktop
- [ ] Slack connection works on mobile
- [ ] Slack channel browser loads
- [ ] Slack multi-workspace works
- [ ] Slack disconnect works
- [ ] Error messages are helpful
- [ ] Loading states appear correctly
- [ ] Confirmation dialogs work
- [ ] Accessibility is good (keyboard/SR)
- [ ] Database persists data
- [ ] Reconnection after disconnect works

---

## 🎉 Success Criteria

The OAuth integration is working correctly if:

✅ Users can connect both Figma and Slack
✅ Authorization completes in <10 seconds
✅ Data (files/channels) loads successfully
✅ Errors are handled gracefully
✅ Disconnection cleans up properly
✅ Reconnection works smoothly
✅ Multi-workspace Slack functions
✅ Mobile experience is smooth
✅ Accessibility standards met
✅ Database stores integrations

---

## 📚 Additional Resources

- **Figma App Settings:** https://www.figma.com/developers/apps
- **Slack App Settings:** https://api.slack.com/apps/A09N20QTNV6
- **Production Server:** https://fluxstudio.art
- **API Documentation:** See FIGMA_OAUTH_ACTIVATED.md and SLACK_OAUTH_ACTIVATED.md

---

**Happy Testing!** 🚀

*Guide created: October 17, 2025*
*Environment: Production*
*Version: Phase 1 OAuth Integration*
