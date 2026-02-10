import type { HelpArticle } from './index';

export const creatingFirstProject: HelpArticle = {
  id: 'creating-first-project',
  slug: 'creating-first-project',
  title: 'Creating Your First Project',
  summary: 'Step-by-step guide to setting up your first project in FluxStudio',
  category: 'Getting Started',
  categoryId: 'getting-started',
  keywords: ['create', 'new project', 'setup', 'template', 'first project', 'start'],
  relatedArticles: ['getting-started', 'file-management', 'collaboration-features'],
  lastUpdated: '2025-02-01',
  readingTime: 4,
  content: `
# Creating Your First Project

Projects are the foundation of FluxStudio. This guide walks you through creating and setting up your first project.

## Quick Create

The fastest way to create a project:

1. Click **New Project** from the Projects page
2. Enter a project name (e.g., "Fall Show 2025")
3. Select a template or start blank
4. Click **Create**

That's it! You're ready to start working.

## Choosing a Template

FluxStudio offers several pre-built templates:

### Marching Band Show
Perfect for marching arts projects with folders for:
- Music & Audio
- Formations
- Costumes
- Props & Equipment

### Indoor Winds
Designed for indoor percussion and winds with:
- Music files
- Choreography notes
- Floor design assets
- Equipment tracking

### Design Project
General creative work including:
- Designs folder
- Assets library
- References
- Deliverables

### Blank Project
Start from scratch with an empty project structure.

## Project Settings

After creation, you can customize your project:

### Basic Information
- **Name**: A clear, descriptive title
- **Description**: Brief overview of the project
- **Status**: Planning, Active, Review, or Completed
- **Priority**: Low, Medium, High, or Critical

### Team Access
- Invite team members by email
- Set roles: Viewer, Editor, or Admin
- Manage permissions for files and sections

### Timeline
- Set project start and end dates
- Create milestones for key deliverables
- Track progress automatically

## Project Structure

Each project includes:

### Files Tab
Upload and organize all your project files:
- Drag and drop to upload
- Create folders for organization
- Preview images, PDFs, and documents

### Tasks Tab
Track work with tasks:
- Create task lists
- Assign team members
- Set due dates

### Team Tab
Manage project members:
- See who has access
- Change roles
- Remove members

## Tips for Success

1. **Use descriptive names** - Future you will thank you
2. **Set up folders early** - Organize before you upload
3. **Invite your team** - Collaboration makes work better
4. **Use templates** - They save time and ensure consistency

## Next Steps

Now that you have a project, learn about:
- File Management
- Collaboration Features
- Messaging Guide
  `.trim(),
};
