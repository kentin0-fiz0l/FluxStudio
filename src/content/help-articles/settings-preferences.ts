import type { HelpArticle } from './index';

export const settingsPreferences: HelpArticle = {
  id: 'settings-preferences',
  slug: 'settings-preferences',
  title: 'Settings & Preferences',
  summary: 'Customize FluxStudio to work the way you want',
  category: 'Account',
  categoryId: 'security',
  keywords: ['settings', 'preferences', 'customize', 'theme', 'dark mode', 'light mode', 'profile'],
  relatedArticles: ['account-management', 'keyboard-shortcuts', 'security-privacy'],
  lastUpdated: '2025-02-01',
  readingTime: 4,
  content: `
# Settings & Preferences

Customize FluxStudio to match your workflow. Access Settings from the sidebar or use Cmd/Ctrl + ,.

## Profile Settings

### Personal Information
Update your profile:
- **Display Name**: How others see you
- **Email**: Your login email
- **Avatar**: Upload a photo or choose an emoji
- **Bio**: Brief description (optional)

### Account Details
- View your account type
- See member since date
- Check organization memberships

## Appearance

### Theme
Choose your preferred look:
- **Light**: Clean, bright interface
- **Dark**: Easy on the eyes, saves battery
- **System**: Matches your OS preference

### Accent Color
Pick a color for buttons and highlights:
- Blue (default)
- Purple
- Green
- Orange
- Custom color picker

### Compact Mode
For more content:
- Reduces spacing
- Smaller fonts
- More items visible

## Notifications

### In-App Notifications
Control what you see:
- New messages
- Mentions
- Project updates
- Task assignments
- System announcements

### Email Notifications
Choose email frequency:
- Instant for important items
- Daily digest
- Weekly summary
- None

### Notification Sounds
- Enable/disable sounds
- Choose sound style
- Set volume level

### Quiet Hours
Pause notifications:
- Set start and end times
- Choose days of week
- Override for urgent items

## Privacy

### Online Status
Control visibility:
- Show online status
- Hide from everyone
- Show to team only

### Activity Status
What others see:
- Currently viewing (project name)
- Last active time
- Typing indicators

### Data Sharing
Control analytics:
- Usage analytics
- Error reporting
- Product improvement

## Language & Region

### Display Language
Choose from:
- English (US)
- English (UK)
- Spanish
- French
- German
- More coming soon

### Time Zone
Set your local time:
- Affects all timestamps
- Meeting invites
- Deadline displays

### Date Format
Choose your preference:
- MM/DD/YYYY
- DD/MM/YYYY
- YYYY-MM-DD

## Accessibility

### Keyboard Navigation
- Full keyboard support
- Skip to content links
- Focus indicators

### Screen Reader
- ARIA labels
- Meaningful headings
- Alt text for images

### Reduced Motion
- Disable animations
- Simple transitions
- Static elements

### High Contrast
- Enhanced color contrast
- Bold text option
- Clearer borders

## Integrations

Manage connected services:
- Figma
- Slack
- GitHub
- Google Workspace

See integration-specific guides for details.

## Exporting Data

### Your Data
Request a copy:
- Profile information
- Your files
- Your messages
- Activity history

### Account Deletion
If you need to leave:
- Data deletion request
- 30-day waiting period
- Confirmation required

## Keyboard Shortcuts

Quick access in Settings:
- View all shortcuts
- Customize shortcuts
- Reset to defaults

## Next Steps

Explore more:
- Account Management
- Keyboard Shortcuts
- Security & Privacy
  `.trim(),
};
