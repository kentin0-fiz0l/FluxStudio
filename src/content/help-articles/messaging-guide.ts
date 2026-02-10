import type { HelpArticle } from './index';

export const messagingGuide: HelpArticle = {
  id: 'messaging-guide',
  slug: 'messaging-guide',
  title: 'Messaging Guide',
  summary: 'Communicate with your team using FluxStudio messaging',
  category: 'Collaboration',
  categoryId: 'collaboration',
  keywords: ['message', 'chat', 'conversation', 'dm', 'direct message', 'group chat', 'communication'],
  relatedArticles: ['collaboration-features', 'keyboard-shortcuts', 'settings-preferences'],
  lastUpdated: '2025-02-01',
  readingTime: 5,
  content: `
# Messaging Guide

FluxStudio includes a powerful messaging system for team communication. Here's how to use it effectively.

## Getting Started with Messages

### Accessing Messages
- Click **Messages** in the sidebar
- Use keyboard shortcut Cmd/Ctrl + Shift + M
- Click the message icon in the header

### Your Inbox
The Messages page shows:
- All conversations (newest first)
- Unread message count
- Online status of participants

## Types of Conversations

### Direct Messages
One-on-one conversations:
1. Click **New Message**
2. Search for a team member
3. Start typing

### Group Conversations
Chat with multiple people:
1. Click **New Message**
2. Add multiple participants
3. Optionally name the group
4. Start the conversation

### Project Channels
Discussion tied to projects:
- Created automatically for each project
- All project members have access
- Great for project-specific updates

## Sending Messages

### Basic Messages
Type in the message box and press Enter to send.

### Rich Formatting
Format your messages:
- **Bold**: Cmd/Ctrl + B or **text**
- *Italic*: Cmd/Ctrl + I or *text*
- Code: Backticks \`code\`
- Links: Paste URLs (auto-detected)

### Attachments
Share files in messages:
1. Click the attachment icon
2. Select files from your computer
3. Or paste images directly

### Mentions
Notify specific people:
- Type @ followed by their name
- Select from the dropdown
- They'll receive a notification

## Message Features

### Reactions
Quick responses:
- Hover over any message
- Click the emoji button
- Select a reaction

### Threads
Keep discussions organized:
- Click **Reply in thread** on any message
- Continue the conversation in a side panel
- Original conversation stays clean

### Editing Messages
Fix mistakes:
- Hover over your message
- Click the edit icon
- Make changes and save
- Shows "edited" indicator

### Deleting Messages
Remove messages:
- Hover over your message
- Click the delete icon
- Confirm deletion
- Cannot be undone

## Notifications

### Real-Time Alerts
Get notified when:
- Someone sends you a message
- You're mentioned in a conversation
- Someone replies to your thread

### Managing Notifications
In Settings > Notifications:
- Enable/disable message sounds
- Set quiet hours
- Choose notification types

### Muting Conversations
For busy channels:
- Open conversation
- Click the settings icon
- Select **Mute**
- Choose duration

## Search

### Finding Messages
Use the search bar to find:
- Messages by content
- Messages from specific people
- Messages in specific date ranges

### Search Operators
- from:name - Messages from someone
- in:channel - Messages in a channel
- has:file - Messages with attachments

## Best Practices

1. **Use channels for projects** - Keep discussions in context
2. **Use threads** - Reduce noise in busy channels
3. **Mention carefully** - Only notify when needed
4. **Mute when needed** - Protect your focus time

## Keyboard Shortcuts

- **Cmd/Ctrl + N** - New message
- **Cmd/Ctrl + /** - Search messages
- **Cmd/Ctrl + Enter** - Send message
- **Up Arrow** - Edit last message

## Next Steps

Learn more about:
- Collaboration Features
- Keyboard Shortcuts
- Settings & Preferences
  `.trim(),
};
