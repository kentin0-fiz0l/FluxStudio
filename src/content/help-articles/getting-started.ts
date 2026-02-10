import type { HelpArticle } from './index';

export const gettingStarted: HelpArticle = {
  id: 'getting-started',
  slug: 'getting-started',
  title: 'Getting Started with FluxStudio',
  summary: 'Learn the basics of FluxStudio and get up and running quickly',
  category: 'Getting Started',
  categoryId: 'getting-started',
  keywords: ['start', 'begin', 'introduction', 'overview', 'basics', 'new user', 'first time'],
  relatedArticles: ['creating-first-project', 'keyboard-shortcuts', 'settings-preferences'],
  lastUpdated: '2025-02-01',
  readingTime: 5,
  content: `
# Welcome to FluxStudio

FluxStudio is your creative collaboration platform designed for design teams, marching arts groups, and creative professionals. This guide will help you understand the core features and get started quickly.

## Quick Overview

FluxStudio provides three main workspaces:

1. **Projects** - Your creative hub where all work happens
2. **Messages** - Real-time team communication
3. **Tools** - Specialized utilities like the Met Map editor

## Getting Around

### Navigation
- Use the sidebar on the left to switch between main sections
- Click on project cards to enter a project workspace
- Use the search bar (Cmd/Ctrl + K) to quickly find anything

### Your Dashboard
When you log in, you'll land on the Projects page. This shows:
- Recent projects you've worked on
- Projects shared with you
- Quick actions to create new work

## First Steps

1. **Complete your profile** - Add your name and avatar in Settings
2. **Create your first project** - Click "New Project" to get started
3. **Invite your team** - Share project links or add team members
4. **Explore the tools** - Check out formation editing and file management

## Key Concepts

### Projects
Projects are containers for all your work. Each project can have:
- Files and assets
- Tasks and milestones
- Team members with different roles
- Real-time collaboration spaces

### Organizations
Organizations group your projects and team members. You can:
- Create multiple organizations
- Invite members with different roles
- Manage billing at the organization level

### Real-Time Collaboration
FluxStudio supports live collaboration:
- See who's online in your projects
- Edit documents together in real-time
- Get instant notifications for changes

## Next Steps

Ready to dive in? Check out these guides:
- Creating Your First Project
- Collaboration Features
- Keyboard Shortcuts
  `.trim(),
};
