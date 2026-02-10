import type { HelpArticle } from './index';

export const accountManagement: HelpArticle = {
  id: 'account-management',
  slug: 'account-management',
  title: 'Account Management',
  summary: 'Manage your FluxStudio account, profile, and security settings',
  category: 'Account',
  categoryId: 'security',
  keywords: ['account', 'profile', 'password', 'email', 'delete account', 'security'],
  relatedArticles: ['settings-preferences', 'security-privacy', 'billing-payments'],
  lastUpdated: '2025-02-01',
  readingTime: 5,
  content: `
# Account Management

Learn how to manage your FluxStudio account, update your profile, and maintain security.

## Your Profile

### Viewing Your Profile
1. Click your avatar in the top right
2. Select "Profile" from the menu
3. View your public profile

### Updating Profile Information

**Display Name**
1. Go to Settings > Profile
2. Enter your new display name
3. Click Save

**Profile Photo**
1. Go to Settings > Profile
2. Click on your avatar
3. Upload a new image (JPG, PNG)
4. Adjust the crop
5. Save changes

**Bio & Description**
Add a brief description:
- What you do
- Your role
- Your interests
- Keep it professional

## Email Management

### Changing Your Email
1. Go to Settings > Account
2. Click "Change Email"
3. Enter your new email
4. Verify with your password
5. Check new email for confirmation
6. Click the verification link

### Email Preferences
Control what emails you receive:
- Product updates
- Feature announcements
- Weekly digest
- Marketing (optional)

## Password & Security

### Changing Your Password
1. Go to Settings > Security
2. Click "Change Password"
3. Enter current password
4. Enter new password twice
5. Click "Update Password"

**Password Requirements:**
- At least 8 characters
- Mix of letters and numbers
- One uppercase letter
- One special character

### Two-Factor Authentication (2FA)

**Enabling 2FA:**
1. Go to Settings > Security
2. Click "Enable 2FA"
3. Scan QR code with authenticator app
4. Enter verification code
5. Save backup codes

**Backup Codes:**
- Download and store safely
- Each code works once
- Use if you lose your device
- Generate new codes if needed

**Disabling 2FA:**
1. Go to Settings > Security
2. Click "Disable 2FA"
3. Enter verification code
4. Confirm with password

### Active Sessions
See where you're logged in:
1. Go to Settings > Security
2. View "Active Sessions"
3. See device, location, time
4. Click "Sign Out" to end session
5. Use "Sign Out All" for security

## Connected Accounts

### Viewing Connections
See linked services:
- Google Account
- Figma
- Slack
- GitHub

### Connecting Services
1. Go to Settings > Integrations
2. Click the service to connect
3. Authorize FluxStudio
4. Grant requested permissions

### Disconnecting Services
1. Go to Settings > Integrations
2. Find the connected service
3. Click "Disconnect"
4. Confirm the action

## Organizations

### Viewing Organizations
See your memberships:
1. Go to your profile
2. View "Organizations" section
3. See your role in each

### Leaving an Organization
1. Go to Organization Settings
2. Click "Leave Organization"
3. Transfer any owned content
4. Confirm departure

### Creating Organizations
1. Click "New Organization"
2. Enter organization name
3. Set up billing (if applicable)
4. Invite team members

## Data & Privacy

### Downloading Your Data
Request a copy of everything:
1. Go to Settings > Privacy
2. Click "Download My Data"
3. Confirm with password
4. Wait for email (may take hours)
5. Download the archive

**Included data:**
- Profile information
- Files you uploaded
- Messages you sent
- Activity history

### Data Retention
- Active data kept indefinitely
- Deleted items in trash for 30 days
- Backups retained 90 days

## Account Deletion

### Before Deleting
Consider:
- Download your data first
- Transfer project ownership
- Notify your team
- This action is permanent

### Deletion Process
1. Go to Settings > Account
2. Click "Delete Account"
3. Read the warnings
4. Transfer or delete content
5. Enter password to confirm
6. 30-day waiting period begins

### Waiting Period
- 30 days to change your mind
- Log in to cancel deletion
- After 30 days, data is removed
- Some anonymized data may remain

### Reactivation
During the 30-day window:
1. Log in with your credentials
2. Click "Cancel Deletion"
3. Account fully restored

## Need Help?

- Contact Support for assistance
- Security issues: security@fluxstudio.art
- Account recovery: support@fluxstudio.art
  `.trim(),
};
