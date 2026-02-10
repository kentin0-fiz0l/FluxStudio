import type { HelpArticle } from './index';

export const troubleshooting: HelpArticle = {
  id: 'troubleshooting',
  slug: 'troubleshooting',
  title: 'Troubleshooting',
  summary: 'Common issues and how to resolve them',
  category: 'Support',
  categoryId: 'getting-started',
  keywords: ['help', 'problem', 'issue', 'error', 'fix', 'troubleshoot', 'not working', 'bug'],
  relatedArticles: ['getting-started', 'account-management', 'security-privacy'],
  lastUpdated: '2025-02-01',
  readingTime: 6,
  content: `
# Troubleshooting

Having issues with FluxStudio? This guide covers common problems and solutions.

## Login Issues

### Can't Log In

**Forgot Password**
1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your inbox (and spam folder)
4. Click the reset link
5. Create a new password

**Account Locked**
After 5 failed attempts, your account may be temporarily locked:
- Wait 15 minutes and try again
- Or contact support for immediate unlock

**Browser Issues**
Try these steps:
1. Clear your browser cache
2. Disable browser extensions
3. Try incognito/private mode
4. Try a different browser

### Two-Factor Authentication Issues

**Lost access to authenticator app:**
1. Use a backup code (if saved)
2. Contact support with ID verification
3. We'll help restore access

**Code not working:**
- Check your device's time is correct
- Make sure you're using the latest code
- Wait for the next code cycle

## Performance Issues

### Slow Loading

**Check your connection:**
- Test your internet speed
- Try a wired connection
- Move closer to WiFi router

**Browser optimization:**
- Close unnecessary tabs
- Clear browser cache
- Update your browser
- Disable heavy extensions

**FluxStudio tips:**
- Close projects you're not using
- Archive old projects
- Reduce the number of open panels

### App Not Responding

1. Refresh the page (Cmd/Ctrl + R)
2. Force refresh (Cmd/Ctrl + Shift + R)
3. Clear browser cache
4. Close and reopen browser
5. Contact support if issue persists

## File Issues

### Upload Failures

**File too large:**
- Maximum file size is 100MB
- Compress images before upload
- Split large videos

**Unsupported format:**
- Check our supported file types list
- Convert to a supported format
- Contact support for format requests

**Network timeout:**
- Check your connection
- Try a smaller file first
- Use a stable connection

### Files Not Displaying

- Refresh the page
- Check if file is still processing
- Clear browser cache
- Try downloading and re-uploading

### Missing Files

1. Check the Trash folder
2. Search for the filename
3. Check if it was moved to another folder
4. Ask team members if they moved it
5. Contact support for recovery

## Collaboration Issues

### Can't See Team Members

- Check if they've accepted the invite
- Verify they have the correct permissions
- Make sure they're online
- Try refreshing the page

### Changes Not Syncing

**Real-time sync issues:**
1. Check your internet connection
2. Refresh the page
3. Check if others see the issue
4. Try a different browser

**Conflict resolution:**
- FluxStudio auto-resolves most conflicts
- Review the changes tab for details
- Contact support if data was lost

### Can't Invite Members

- Check your role (Admin required for invites)
- Verify the email is correct
- Check if they're already a member
- Contact organization admin

## Notification Issues

### Not Receiving Notifications

**In-app notifications:**
1. Check Settings > Notifications
2. Ensure notifications are enabled
3. Check if you've muted the conversation
4. Verify quiet hours settings

**Browser notifications:**
1. Check browser permission settings
2. Allow notifications for FluxStudio
3. Make sure browser isn't in DND mode

**Email notifications:**
1. Check spam/junk folder
2. Verify email settings in FluxStudio
3. Whitelist our email domain

### Too Many Notifications

- Mute busy conversations
- Adjust notification preferences
- Set quiet hours
- Review what triggers notifications

## Mobile Issues

### PWA Not Working

**Install issues:**
1. Use Chrome or Safari (iOS)
2. Visit fluxstudio.art
3. Look for "Add to Home Screen"
4. Follow the prompts

**Sync issues:**
1. Check internet connection
2. Force close and reopen
3. Clear app cache
4. Reinstall the PWA

## Browser-Specific Issues

### Chrome
- Clear cache: Settings > Privacy > Clear Data
- Disable extensions: Menu > More Tools > Extensions
- Update Chrome: Menu > Help > About

### Safari
- Clear cache: Safari > Preferences > Privacy
- Disable extensions: Safari > Preferences > Extensions
- Update Safari: System updates

### Firefox
- Clear cache: Preferences > Privacy > Clear Data
- Disable extensions: Add-ons menu
- Update Firefox: Menu > Help > About

## Still Need Help?

If these solutions don't work:

1. **Check Status Page** - See if there's an outage
2. **Search Help Center** - More specific guides
3. **Contact Support** - We're here to help
4. **Community Forum** - Ask other users

When contacting support, include:
- Browser and version
- Operating system
- Steps to reproduce
- Error messages (screenshots help)
- Time when issue occurred
  `.trim(),
};
