import type { HelpArticle } from './index';

export const collaborationFeatures: HelpArticle = {
  id: 'collaboration-features',
  slug: 'collaboration-features',
  title: 'Collaboration Features',
  summary: 'Learn how to work together with your team in real-time',
  category: 'Collaboration',
  categoryId: 'collaboration',
  keywords: ['collaborate', 'team', 'share', 'real-time', 'together', 'work together', 'invite'],
  relatedArticles: ['messaging-guide', 'creating-first-project', 'file-management'],
  lastUpdated: '2025-02-01',
  readingTime: 6,
  content: `
# Collaboration Features

FluxStudio is built for teams. This guide covers all the ways you can work together effectively.

## Real-Time Presence

See who's working with you:

### Online Indicators
- Green dots show online team members
- See who's viewing the same project
- Hover to see last activity time

### Cursor Sharing
In collaborative editors:
- See teammates' cursors in real-time
- Each person has a unique color
- Names appear above cursors

## Sharing and Permissions

### Invite Team Members

1. Open your project
2. Go to the Team tab
3. Click **Invite Member**
4. Enter their email address
5. Select their role
6. Send the invitation

### Role Levels

**Viewer**
- Can view all project content
- Cannot edit or upload
- Can leave comments

**Editor**
- Full access to create and edit
- Can upload files
- Can manage tasks

**Admin**
- Everything an Editor can do
- Can invite and remove members
- Can change project settings

### Sharing Links
Generate shareable links for:
- View-only access
- Comment access
- Full edit access

Links can be revoked at any time.

## Comments and Feedback

### Adding Comments
1. Select any item (file, task, section)
2. Click the comment icon
3. Type your feedback
4. Mention teammates with @name

### Comment Features
- **Threads**: Reply to specific comments
- **Mentions**: Notify teammates directly
- **Reactions**: Quick emoji responses
- **Resolution**: Mark comments as resolved

### Review Workflows
For design reviews:
1. Share the file with reviewers
2. They add comments and annotations
3. You address each comment
4. Mark as resolved when done

## Live Editing

### Collaborative Documents
Multiple people can edit simultaneously:
- Changes sync instantly
- No conflicts or lost work
- Full edit history preserved

### Version History
Track all changes:
- See who made each change
- Restore previous versions
- Compare versions side-by-side

## Notifications

Stay informed about team activity:

### Types of Notifications
- New comments on your work
- Mentions in messages
- Project updates
- Task assignments

### Notification Settings
Customize in Settings:
- Choose notification types
- Set quiet hours
- Enable/disable sounds

## Team Communication

### Quick Messages
- Direct message teammates
- Create group conversations
- Share files in chat

### Activity Feed
- See all project updates
- Filter by type or person
- Jump to any change

## Best Practices

1. **Set clear roles** - Everyone knows their responsibilities
2. **Use comments** - Keep discussions in context
3. **Stay responsive** - Check notifications regularly
4. **Communicate changes** - Let the team know about big updates

## Next Steps

Explore more collaboration tools:
- Messaging Guide
- Settings & Preferences
- File Management
  `.trim(),
};
