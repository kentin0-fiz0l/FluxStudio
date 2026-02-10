import type { HelpArticle } from './index';

export const integrationsSlack: HelpArticle = {
  id: 'integrations-slack',
  slug: 'integrations-slack',
  title: 'Slack Integration',
  summary: 'Get FluxStudio notifications in Slack and share updates',
  category: 'Integrations',
  categoryId: 'integrations',
  keywords: ['slack', 'integration', 'notifications', 'channel', 'messages'],
  relatedArticles: ['integrations-figma', 'messaging-guide', 'collaboration-features'],
  lastUpdated: '2025-02-01',
  readingTime: 4,
  content: `
# Slack Integration

Connect FluxStudio to Slack for notifications, updates, and better team coordination.

## Setting Up

### Connecting Slack
1. Go to Settings > Integrations
2. Find Slack in the list
3. Click "Connect"
4. Choose your Slack workspace
5. Authorize FluxStudio
6. Select a default channel
7. Connection complete!

### Permissions
FluxStudio requests:
- Post messages to channels
- Read channel list
- Send direct messages

We only post when you configure it.

## Notification Settings

### Types of Notifications

**Project Notifications**
- New project created
- Project status changes
- Milestone completions
- Deadline reminders

**Collaboration Notifications**
- New comments
- Mentions
- Approval requests
- Approval decisions

**File Notifications**
- New file uploads
- File updates
- Share notifications

### Configuring Notifications
1. Go to Settings > Integrations > Slack
2. Click "Notification Settings"
3. Choose which events to send
4. Select destination channels
5. Save settings

### Per-Project Settings
Configure per project:
1. Open project settings
2. Find "Slack Notifications"
3. Choose channel for this project
4. Select notification types
5. Save

## Channel Setup

### Choosing Channels
Recommended setup:
- **#fluxstudio-general** - All notifications
- **#project-name** - Per-project updates
- **#design-reviews** - Approval requests

### Creating Dedicated Channels
1. Create channel in Slack
2. Invite FluxStudio bot
3. Configure in FluxStudio settings
4. Map projects to channels

### Multiple Workspaces
For multiple Slack workspaces:
1. Connect each workspace separately
2. Map different projects
3. Manage in integration settings

## Using the Integration

### Receiving Notifications
Notifications appear as:
- Bot messages in channels
- Rich previews with actions
- Links back to FluxStudio

### Quick Actions
React to notifications:
- Click "View" to open in FluxStudio
- Click "Approve" for quick approvals
- Reply in thread for context

### Sharing to Slack
From FluxStudio:
1. Click share button on any item
2. Select "Share to Slack"
3. Choose channel or person
4. Add a message (optional)
5. Send

## Slash Commands

Use Slack to interact with FluxStudio:

### Available Commands
\`\`\`
/flux projects - List your projects
/flux search [query] - Search FluxStudio
/flux status - Check FluxStudio status
/flux help - Show available commands
\`\`\`

### Command Examples
\`\`\`
/flux projects recent
/flux search "Fall Show designs"
/flux status
\`\`\`

## Workflow Integration

### Approval Workflows
1. Submit for approval in FluxStudio
2. Notification posts to Slack
3. Approver clicks "Approve" or "Request Changes"
4. Action syncs back to FluxStudio

### Daily Digests
Opt into daily summaries:
- Morning: Tasks due today
- Evening: Activity summary
- Configure timing in settings

### Mentions Sync
When mentioned in FluxStudio:
- DM sent in Slack
- Link to conversation
- Quick reply option

## Best Practices

1. **Use dedicated channels** - Reduce noise in general channels
2. **Configure wisely** - Only send important notifications
3. **Use digests** - For less urgent updates
4. **Train your team** - Show them the quick actions
5. **Review regularly** - Adjust settings as needed

## Troubleshooting

### Not Receiving Notifications
- Check Slack bot is in channel
- Verify notification settings
- Check Slack notification preferences
- Reconnect if needed

### Bot Not Responding
- Check FluxStudio service status
- Try reconnecting integration
- Verify workspace permissions
- Contact support

### Wrong Channel
- Update project settings
- Check default channel
- Verify channel mapping

### Permission Errors
- Re-authorize in Slack
- Check bot permissions
- Invite bot to channels
- Contact Slack admin

## Managing the Integration

### Updating Settings
1. Go to Settings > Integrations
2. Click "Configure" next to Slack
3. Update channels and notifications
4. Save changes

### Reconnecting
If connection breaks:
1. Click "Disconnect"
2. Click "Connect" again
3. Re-authorize
4. Reconfigure settings

### Disconnecting
To remove the integration:
1. Go to Settings > Integrations
2. Click "Disconnect" next to Slack
3. Confirm removal
4. Also remove from Slack workspace settings

## Privacy & Security

- Messages only sent when configured
- No access to other Slack messages
- Permissions can be revoked anytime
- Audit logs available

## Need Help?

- Check Slack's help center
- Review our integration guide
- Contact support
  `.trim(),
};
