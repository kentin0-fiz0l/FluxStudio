import type { HelpArticle } from './index';

export const integrationsFigma: HelpArticle = {
  id: 'integrations-figma',
  slug: 'integrations-figma',
  title: 'Figma Integration',
  summary: 'Connect Figma to import and sync your designs',
  category: 'Integrations',
  categoryId: 'integrations',
  keywords: ['figma', 'design', 'integration', 'import', 'sync', 'prototype'],
  relatedArticles: ['integrations-slack', 'file-management', 'collaboration-features'],
  lastUpdated: '2025-02-01',
  readingTime: 4,
  content: `
# Figma Integration

Connect FluxStudio to Figma to import designs, sync updates, and streamline your workflow.

## Setting Up

### Connecting Figma
1. Go to Settings > Integrations
2. Find Figma in the list
3. Click "Connect"
4. Sign in to Figma (if needed)
5. Authorize FluxStudio
6. Connection complete!

### Permissions Required
FluxStudio requests:
- Read access to files
- Read access to teams
- Read access to projects

We never modify your Figma files.

## Importing Designs

### Import a Figma File
1. Open your FluxStudio project
2. Go to the Files tab
3. Click "Import from Figma"
4. Browse your Figma files
5. Select the file to import
6. Choose import options
7. Click "Import"

### Import Options

**Full File Import**
- Imports entire Figma file
- All pages and frames
- Best for complete designs

**Selected Frames**
- Choose specific frames
- Faster import
- Best for specific assets

**As Images**
- Export as PNG/JPG
- Fastest option
- No editability

**As Links**
- Embed Figma preview
- Always up to date
- Requires internet

## Syncing Designs

### Manual Sync
Keep designs updated:
1. Right-click the imported file
2. Select "Sync from Figma"
3. Review changes
4. Confirm sync

### Auto-Sync (Pro Feature)
Set up automatic syncing:
1. Go to project settings
2. Enable Figma auto-sync
3. Choose sync frequency
4. Select files to sync

**Sync frequencies:**
- Real-time (webhook)
- Hourly
- Daily
- Manual only

## Working with Designs

### Viewing Imports
Imported designs show:
- Preview thumbnail
- Figma file name
- Last sync time
- Original file link

### Opening in Figma
- Click "Open in Figma" button
- Opens original file
- Make edits there
- Sync back when done

### Commenting
Leave feedback:
1. Click on imported design
2. Use the comment tool
3. Comments sync with your team
4. Don't affect Figma file

## Collaboration Features

### Design Reviews
Use FluxStudio for reviews:
- Import the design
- Share with stakeholders
- Collect comments
- Track approvals

Benefits over Figma:
- Non-designers don't need Figma
- Centralized feedback
- Approval workflows
- Activity tracking

### Version Comparison
Compare design versions:
1. Import multiple versions
2. Use side-by-side view
3. Highlight differences
4. Add comparison notes

## Export Options

### Export from FluxStudio
After review, export:
- As images (PNG, JPG, SVG)
- As PDF (for print)
- As presentation deck
- Back to Figma (link)

### Asset Extraction
Extract individual assets:
1. Open imported file
2. Select elements
3. Click "Export Asset"
4. Choose format
5. Download

## Best Practices

1. **Link, don't copy** - Use embedded previews for live docs
2. **Sync regularly** - Keep designs current
3. **Use for reviews** - Let non-designers comment here
4. **Version control** - Import snapshots at milestones
5. **Clean up** - Remove outdated imports

## Troubleshooting

### Import Failed
- Check internet connection
- Verify Figma file access
- Ensure file isn't too large
- Try importing fewer frames

### Sync Not Working
- Re-authorize Figma connection
- Check if file still exists
- Verify you have access
- Try manual sync first

### Slow Performance
- Import specific frames only
- Use image export option
- Reduce file complexity
- Clear browser cache

### Permission Errors
- Reconnect Figma account
- Check team permissions
- Contact file owner
- Verify organization access

## Disconnecting

If you need to disconnect:
1. Go to Settings > Integrations
2. Find Figma
3. Click "Disconnect"
4. Imported files remain
5. Sync features disabled

## Need Help?

- Check Figma's help center
- Contact our support
- See troubleshooting guide
  `.trim(),
};
