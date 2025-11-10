# Phase 3D: Project Integration Testing Guide

## Overview
This guide provides comprehensive testing instructions for the FluxPrint Project Integration features implemented in Phase 3D.

## Implementation Status

### ✅ Completed Components

1. **Database Migration** (`/database/migrations/013_printing_project_files.sql`)
   - `printing_files` table created
   - `project_print_stats_detailed` view created
   - SQL functions for queries created

2. **Backend API Endpoints** (`/server-unified.js`)
   - POST `/api/printing/files/:filename/link` - Link file to project
   - DELETE `/api/printing/files/:filename/link` - Unlink file from project
   - GET `/api/printing/projects/:projectId/files` - Get files for a project
   - GET `/api/printing/projects/:projectId/stats/detailed` - Get print statistics
   - GET `/api/printing/jobs/history/filter` - Filter print history by project

3. **FileBrowser Component** (`/src/components/printing/FileBrowser.tsx`)
   - Project selector dropdown
   - File linking/unlinking functionality
   - Project badges on linked files
   - Filter by project capability

4. **PrintHistory Component** (`/src/components/printing/PrintHistory.tsx`)
   - Project filter dropdown
   - Filter print jobs by project
   - Display project names in history

5. **ProjectPrintStats Component** (`/src/components/printing/ProjectPrintStats.tsx`)
   - Comprehensive statistics display
   - Success rate visualization
   - Material usage tracking
   - Print time analytics

## End-to-End Testing Workflows

### Workflow 1: Link Existing File to Project

1. **Prerequisites**
   - Ensure user is authenticated
   - At least one project exists
   - At least one G-code file is uploaded

2. **Steps**
   ```
   a. Navigate to /printing
   b. Open FileBrowser component
   c. Locate an unlinked file
   d. Click the "Link to Project" button
   e. Select a project from the modal
   f. Verify the file shows project badge
   ```

3. **Expected Results**
   - File is successfully linked to project
   - Project badge appears next to filename
   - File appears when filtering by that project

### Workflow 2: Filter Files by Project

1. **Prerequisites**
   - Multiple files linked to different projects
   - Some unlinked files exist

2. **Steps**
   ```
   a. Navigate to /printing
   b. In FileBrowser, click project dropdown
   c. Select a specific project
   d. Verify only files from that project show
   e. Select "All Files" option
   f. Verify all files are visible again
   ```

3. **Expected Results**
   - Project filter correctly shows/hides files
   - Project badges remain visible
   - File count updates appropriately

### Workflow 3: Print History Filtering

1. **Prerequisites**
   - Multiple print jobs exist
   - Jobs are linked to different projects

2. **Steps**
   ```
   a. Navigate to /printing
   b. View PrintHistory component
   c. Click project filter dropdown
   d. Select a specific project
   e. Verify only jobs from that project show
   f. Check job details display correctly
   ```

3. **Expected Results**
   - History filters correctly by project
   - Project names display in job cards
   - Statistics update based on filter

### Workflow 4: Project Print Statistics

1. **Prerequisites**
   - Project with linked files
   - Some completed print jobs for the project

2. **Steps**
   ```
   a. Add ProjectPrintStats to a project page
   b. Pass the projectId prop
   c. Verify stats load correctly
   d. Check all metrics display
   e. Test with project having no prints
   ```

3. **Expected Results**
   - Statistics display accurately
   - Success rate calculation is correct
   - Material usage totals are accurate
   - Empty state shows for projects with no prints

## API Testing

### Test Link File Endpoint

```bash
# Link a file to a project
curl -X POST http://localhost:3001/api/printing/files/test.gcode/link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "project_id": "PROJECT_ID",
    "metadata": {"source": "manual"}
  }'

# Expected: 201 Created with file details
```

### Test Unlink File Endpoint

```bash
# Unlink a file
curl -X DELETE http://localhost:3001/api/printing/files/test.gcode/link \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK with success message
```

### Test Get Project Files

```bash
# Get files for a project
curl http://localhost:3001/api/printing/projects/PROJECT_ID/files \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK with files array
```

### Test Project Stats

```bash
# Get project statistics
curl http://localhost:3001/api/printing/projects/PROJECT_ID/stats/detailed \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK with comprehensive stats
```

## Component Integration Testing

### FileBrowser Integration

```typescript
// Example usage in a parent component
import { FileBrowser } from '@/components/printing';

function PrintingPage() {
  return (
    <FileBrowser
      files={files}
      onUpload={handleUpload}
      onDelete={handleDelete}
      onAddToQueue={handleAddToQueue}
    />
  );
}
```

### ProjectPrintStats Integration

```typescript
// Example usage in a project page
import { ProjectPrintStats } from '@/components/printing';

function ProjectDetailPage({ projectId }) {
  return (
    <div>
      <ProjectPrintStats
        projectId={projectId}
        showDetailedView={true}
      />
    </div>
  );
}
```

## Database Verification

### Check Linked Files

```sql
-- View all linked files
SELECT
  pf.*,
  p.title as project_name
FROM printing_files pf
LEFT JOIN projects p ON pf.project_id = p.id
ORDER BY pf.created_at DESC;
```

### Verify Project Stats

```sql
-- Check project statistics
SELECT * FROM project_print_stats_detailed
WHERE project_id = 'YOUR_PROJECT_ID';
```

## Error Scenarios to Test

1. **Link Already Linked File**
   - Attempt to link a file that's already linked
   - Should show appropriate error message

2. **Unauthorized Access**
   - Try to link file to project user doesn't own
   - Should return 403 Forbidden

3. **Invalid Project ID**
   - Attempt to link to non-existent project
   - Should return appropriate error

4. **Network Failures**
   - Test component behavior during API failures
   - Loading states should display correctly
   - Error messages should be user-friendly

## Performance Testing

1. **Large File Lists**
   - Test with 100+ files
   - Verify scrolling performance
   - Check filter responsiveness

2. **Statistics Calculation**
   - Test with projects having 1000+ print jobs
   - Verify stats load within 2 seconds
   - Check memory usage

## Accessibility Testing

1. **Keyboard Navigation**
   - All buttons accessible via Tab
   - Dropdowns navigable with arrow keys
   - Modal can be closed with Escape

2. **Screen Reader Support**
   - Proper ARIA labels on buttons
   - Status messages announced
   - Project badges readable

## Browser Compatibility

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsiveness

Verify on:
- iPhone (various sizes)
- Android phones
- Tablets
- Desktop (various resolutions)

## Success Criteria

- [ ] All workflows complete without errors
- [ ] API endpoints return expected data
- [ ] Components render correctly
- [ ] Project filtering works as expected
- [ ] Statistics calculate accurately
- [ ] Error handling is robust
- [ ] Performance meets requirements
- [ ] Accessibility standards met
- [ ] Cross-browser compatibility confirmed

## Troubleshooting

### Common Issues

1. **Files not linking**
   - Check authentication token
   - Verify project permissions
   - Check network requests in DevTools

2. **Stats not displaying**
   - Ensure database view exists
   - Check API endpoint response
   - Verify projectId is correct

3. **Filter not working**
   - Check state management
   - Verify API returns filtered data
   - Check component re-rendering

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Conduct UAT with stakeholders
3. Monitor performance metrics
4. Gather user feedback
5. Plan Phase 4 enhancements