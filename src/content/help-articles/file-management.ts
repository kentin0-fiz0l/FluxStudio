import type { HelpArticle } from './index';

export const fileManagement: HelpArticle = {
  id: 'file-management',
  slug: 'file-management',
  title: 'File Management',
  summary: 'Upload, organize, and share files in your projects',
  category: 'Projects',
  categoryId: 'projects',
  keywords: ['files', 'upload', 'download', 'folder', 'organize', 'storage', 'share', 'assets'],
  relatedArticles: ['creating-first-project', 'collaboration-features', 'security-privacy'],
  lastUpdated: '2025-02-01',
  readingTime: 5,
  content: `
# File Management

FluxStudio provides powerful tools for managing your project files. Here's everything you need to know.

## Uploading Files

### Drag and Drop
The easiest way to upload:
1. Open your project
2. Go to the Files tab
3. Drag files from your computer
4. Drop them anywhere in the file area

### Upload Button
For more control:
1. Click **Upload** button
2. Select files from your computer
3. Choose the destination folder
4. Click **Upload**

### Supported File Types
- **Images**: JPG, PNG, GIF, SVG, WebP
- **Documents**: PDF, DOC, DOCX, TXT
- **Audio**: MP3, WAV, M4A
- **Video**: MP4, MOV, WebM
- **Design**: AI, PSD, Sketch, Figma

## Organizing Files

### Creating Folders
Keep files organized:
1. Click **New Folder**
2. Enter a folder name
3. Drag files into folders

### Moving Files
- Drag files to move between folders
- Use right-click > Move to
- Select multiple files with Cmd/Ctrl + Click

### Renaming
- Click on file name to edit
- Right-click > Rename
- Use keyboard shortcut F2

## File Actions

### Preview
Click any file to preview:
- Images display full size
- PDFs open in viewer
- Audio/video play in browser
- Documents show content

### Download
Get files to your computer:
- Click download icon
- Right-click > Download
- Select multiple > Bulk download

### Share
Share files with others:
- Generate a share link
- Set view or edit permissions
- Set expiration date (optional)

### Delete
Remove files:
- Click delete icon
- Confirm deletion
- Files move to trash first

## Version Control

### Automatic Versioning
FluxStudio keeps file history:
- Every upload creates a version
- Previous versions stored
- Compare versions easily

### Viewing History
1. Right-click on file
2. Select **Version History**
3. See all previous versions
4. Preview or restore any version

### Restoring Versions
1. Open version history
2. Find the version you want
3. Click **Restore**
4. Current file becomes new version

## File Search

### Quick Search
Find files fast:
- Use the search bar
- Search by filename
- Filter by file type

### Advanced Filters
- By date uploaded
- By file type
- By uploader
- By folder

## Storage Management

### Checking Usage
- View storage in Settings
- See breakdown by project
- Monitor usage trends

### Managing Space
- Delete unused files
- Empty trash regularly
- Archive old projects

## Best Practices

1. **Use descriptive names** - Include dates or versions
2. **Create folder structure** - Organize before uploading
3. **Regular cleanup** - Remove old or duplicate files
4. **Use version history** - Don't create "v2" files manually

## File Security

- All files encrypted at rest
- Secure transfer (HTTPS)
- Access controlled by permissions
- Audit logs for downloads

See Security & Privacy for more details.

## Next Steps

Learn more about:
- Collaboration Features
- Settings & Preferences
- Security & Privacy
  `.trim(),
};
