# Phase 3D: Project Integration - Technical Architecture Specification

## Overview
Deep integration between FluxStudio projects and FluxPrint 3D printing workflow. This phase enables users to organize G-code files by project, track all prints per project, and view project-level statistics.

## Current State Analysis

### Existing Components (Phase 2.5)
- ✅ `print_jobs` table with project linking capability
- ✅ Print job history API: `GET /api/printing/jobs/history`
- ✅ Project stats API: `GET /api/printing/projects/:projectId/stats`
- ✅ Job linking API: `POST /api/printing/jobs/:jobId/link`
- ✅ FileBrowser component (file list, upload, queue)
- ✅ PrintHistory component (job history display)
- ✅ PrintQueue component (active jobs)

### Gaps to Address
1. **No file-project association table** - Files can't be permanently linked to projects
2. **No project selector in FileBrowser** - Users can't filter files by project
3. **No file linking UI** - Users must manually link jobs via API
4. **Limited project context in PrintHistory** - Shows project_name but no filtering
5. **No project statistics widget** - Project pages don't show print stats

## Database Schema Design

### New Table: `printing_files`
Tracks G-code files and their project associations.

```sql
CREATE TABLE printing_files (
  id TEXT PRIMARY KEY DEFAULT gen_cuid(),

  -- Project association
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- FluxStudio file reference (if uploaded through FluxStudio)
  file_id TEXT REFERENCES files(id) ON DELETE SET NULL,

  -- File information
  filename TEXT NOT NULL,  -- Name in OctoPrint/FluxPrint
  file_path TEXT,          -- Path in OctoPrint storage
  file_size BIGINT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB,  -- Store slicer settings, estimates, etc.
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(project_id, filename)  -- One file per project
);

-- Indexes
CREATE INDEX idx_printing_files_project ON printing_files(project_id);
CREATE INDEX idx_printing_files_filename ON printing_files(filename);
CREATE INDEX idx_printing_files_user ON printing_files(uploaded_by);
```

### Enhanced View: `project_print_stats_detailed`
Replaces/enhances existing `print_job_stats_by_project`.

```sql
CREATE OR REPLACE VIEW project_print_stats_detailed AS
SELECT
  p.id as project_id,
  p.title as project_name,

  -- File counts
  COUNT(DISTINCT pf.filename) as total_files,

  -- Print job counts
  COUNT(pj.id) as total_prints,
  COUNT(CASE WHEN pj.status = 'completed' THEN 1 END) as successful_prints,
  COUNT(CASE WHEN pj.status = 'failed' THEN 1 END) as failed_prints,
  COUNT(CASE WHEN pj.status = 'canceled' THEN 1 END) as canceled_prints,

  -- Success rate
  CASE
    WHEN COUNT(pj.id) > 0 THEN
      ROUND((COUNT(CASE WHEN pj.status = 'completed' THEN 1 END)::DECIMAL / COUNT(pj.id)) * 100, 1)
    ELSE 0
  END as success_rate,

  -- Material usage
  SUM(pj.material_used) FILTER (WHERE pj.status = 'completed') as total_material_grams,
  AVG(pj.material_used) FILTER (WHERE pj.status = 'completed') as avg_material_per_print,

  -- Time statistics
  AVG(EXTRACT(EPOCH FROM (pj.completed_at - pj.started_at))) FILTER (WHERE pj.status = 'completed')::INTEGER as avg_print_time_seconds,
  SUM(EXTRACT(EPOCH FROM (pj.completed_at - pj.started_at))) FILTER (WHERE pj.status = 'completed')::INTEGER as total_print_time_seconds,

  -- Recent activity
  MAX(pj.completed_at) as last_print_date,
  MAX(pf.upload_date) as last_file_upload

FROM projects p
LEFT JOIN printing_files pf ON p.id = pf.project_id
LEFT JOIN print_jobs pj ON pf.filename = pj.file_name AND pj.project_id = p.id
GROUP BY p.id, p.title;
```

### Schema Modifications to `print_jobs`
No changes needed - already has `project_id` foreign key.

## API Endpoint Design

### File-Project Association Endpoints

#### 1. Link File to Project
```
POST /api/printing/files/:filename/link
Authorization: Bearer <token>

Request Body:
{
  "project_id": "clxxx123",
  "file_id": "clxxx456",  // Optional: FluxStudio file ID
  "metadata": {           // Optional: file metadata
    "estimated_time": 3600,
    "material": "PLA",
    "layer_height": 0.2
  }
}

Response 201:
{
  "success": true,
  "file": {
    "id": "clxxx789",
    "project_id": "clxxx123",
    "filename": "part1.gcode",
    "created_at": "2025-01-15T10:30:00Z"
  }
}

Response 400: Invalid project_id or filename
Response 403: User lacks permission to modify project
Response 409: File already linked to another project
```

#### 2. Unlink File from Project
```
DELETE /api/printing/files/:filename/link
Authorization: Bearer <token>

Query Params:
  - project_id: (optional) Verify project before unlinking

Response 200:
{
  "success": true,
  "message": "File unlinked from project"
}

Response 404: File link not found
Response 403: User lacks permission
```

#### 3. Get Files for Project
```
GET /api/printing/projects/:projectId/files
Authorization: Bearer <token>

Response 200:
{
  "files": [
    {
      "id": "clxxx789",
      "filename": "part1.gcode",
      "file_size": 1024000,
      "upload_date": "2025-01-15T10:30:00Z",
      "uploaded_by": "user@example.com",
      "print_count": 5,
      "last_printed": "2025-01-20T14:00:00Z",
      "metadata": {...}
    }
  ],
  "total_files": 1
}

Response 403: User lacks permission to view project
Response 404: Project not found
```

#### 4. Enhanced Project Stats (extends existing endpoint)
```
GET /api/printing/projects/:projectId/stats
Authorization: Bearer <token>

Response 200:
{
  "project_id": "clxxx123",
  "project_name": "Fall 2024 Marching Show",
  "total_files": 12,
  "total_prints": 45,
  "successful_prints": 42,
  "failed_prints": 2,
  "canceled_prints": 1,
  "success_rate": 93.3,
  "total_material_grams": 2450.5,
  "avg_material_per_print": 58.3,
  "avg_print_time_seconds": 3600,
  "total_print_time_seconds": 162000,
  "last_print_date": "2025-01-20T14:00:00Z",
  "last_file_upload": "2025-01-18T09:00:00Z"
}
```

#### 5. Enhanced Job History with Filtering
```
GET /api/printing/jobs/history?project_id=clxxx123&limit=50
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "clxxx999",
    "file_name": "part1.gcode",
    "project_id": "clxxx123",
    "project_name": "Fall 2024 Marching Show",
    "status": "completed",
    "progress": 100,
    "duration_seconds": 3600,
    "material_used": 55.2,
    "completed_at": "2025-01-20T14:00:00Z",
    ...
  }
]
```

### Upload with Auto-Linking
Modify existing upload endpoint to accept project context:

```
POST /api/printing/files/upload?project_id=clxxx123
Authorization: Bearer <token>
Content-Type: multipart/form-data

- Uploads file to OctoPrint
- Creates entry in printing_files table
- Returns file info with project link
```

## Permission Validation Strategy

### Project Access Control
All file-project operations must validate:

1. **User is authenticated** (via `authenticateToken` middleware)
2. **User has access to project** (member, owner, or collaborator)
3. **Project exists and is not deleted**

### Permission Check Function
```javascript
async function canUserAccessProject(userId, projectId) {
  // Check if user is project owner or member
  const result = await query(`
    SELECT p.id
    FROM projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE p.id = $1
      AND (p."clientId" = $2 OR pm.user_id = $2)
      AND p.deleted_at IS NULL
  `, [projectId, userId]);

  return result.rows.length > 0;
}
```

### Security Considerations
1. **SQL Injection**: Use parameterized queries
2. **Authorization**: Verify project membership before file operations
3. **File Path Traversal**: Validate filename doesn't contain path separators
4. **Rate Limiting**: Apply to upload endpoints
5. **Input Validation**: Sanitize project_id, filename, metadata

## Frontend Component Design

### 1. FileBrowser Enhancements

#### Project Selector
```tsx
// Add at top of FileBrowser component
interface ProjectOption {
  id: string;
  name: string;
  printFileCount?: number;
}

const [selectedProject, setSelectedProject] = useState<string | null>(null);
const [projects, setProjects] = useState<ProjectOption[]>([]);

// Fetch user's projects
useEffect(() => {
  const fetchProjects = async () => {
    const response = await fetch('/projects');
    const data = await response.json();
    setProjects(data.projects.map(p => ({
      id: p.id,
      name: p.title
    })));
  };
  fetchProjects();
}, []);

// Dropdown component
<Select value={selectedProject || 'all'} onValueChange={setSelectedProject}>
  <SelectTrigger>
    <SelectValue placeholder="All Files" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Files</SelectItem>
    {projects.map(p => (
      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### File Linking UI
```tsx
// Add link button to FileItem component
const [linkModalOpen, setLinkModalOpen] = useState(false);

// Link modal
<Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Link File to Project</DialogTitle>
    </DialogHeader>
    <Select onValueChange={handleLinkToProject}>
      {projects.map(p => (
        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
      ))}
    </Select>
  </DialogContent>
</Dialog>
```

#### Filter Files by Project
```tsx
const filteredFiles = useMemo(() => {
  if (!selectedProject || selectedProject === 'all') {
    return fileList;
  }

  // Fetch files for project
  // Or filter locally if file metadata includes project_id
  return fileList.filter(f => f.project_id === selectedProject);
}, [fileList, selectedProject]);
```

### 2. PrintHistory Enhancements

#### Project Filter Dropdown
```tsx
const [filterProject, setFilterProject] = useState<string | null>(null);

// Modify fetchHistory to include project filter
const fetchHistory = async () => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (filterProject) {
    params.append('project_id', filterProject);
  }

  const response = await fetch(`/api/printing/jobs/history?${params}`);
  const data = await response.json();
  setHistory(data);
};
```

#### Project Statistics Banner
```tsx
{filterProject && projectStats && (
  <div className="bg-primary-50 p-4 rounded-lg mb-4">
    <h3 className="font-semibold">{projectStats.project_name}</h3>
    <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
      <div>
        <div className="text-gray-600">Success Rate</div>
        <div className="text-lg font-bold">{projectStats.success_rate}%</div>
      </div>
      <div>
        <div className="text-gray-600">Total Prints</div>
        <div className="text-lg font-bold">{projectStats.total_prints}</div>
      </div>
      <div>
        <div className="text-gray-600">Material Used</div>
        <div className="text-lg font-bold">{projectStats.total_material_grams}g</div>
      </div>
      <div>
        <div className="text-gray-600">Files</div>
        <div className="text-lg font-bold">{projectStats.total_files}</div>
      </div>
    </div>
  </div>
)}
```

### 3. New Component: ProjectPrintStats

```tsx
// /Users/kentino/FluxStudio/src/components/printing/ProjectPrintStats.tsx
interface ProjectPrintStatsProps {
  projectId: string;
  className?: string;
}

export function ProjectPrintStats({ projectId, className }: ProjectPrintStatsProps) {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [recentPrints, setRecentPrints] = useState<PrintJob[]>([]);

  // Fetch project print statistics
  // Display charts: success rate, material usage over time
  // Show recent prints list
  // Quick actions: "Print Again", "View All Prints"

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>3D Printing Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats grid */}
        {/* Recent prints */}
        {/* Actions */}
      </CardContent>
    </Card>
  );
}
```

### 4. PrintQueue Enhancements

Add project badge to queue items:
```tsx
{job.project_name && (
  <Badge variant="outline" className="ml-2">
    <Folder className="w-3 h-3 mr-1" />
    {job.project_name}
  </Badge>
)}
```

## Implementation Workflow

### Phase 1: Database (1-2 hours)
1. Create migration `013_printing_project_files.sql`
2. Run migration on development database
3. Verify tables and views created
4. Test queries manually

### Phase 2: Backend API (2-3 hours)
1. Implement permission validation function
2. Add file linking endpoints (POST/DELETE)
3. Add project files endpoint (GET)
4. Enhance stats endpoint with detailed view
5. Modify upload endpoint for auto-linking
6. Add project_id filtering to history endpoint

### Phase 3: Frontend - FileBrowser (2-3 hours)
1. Add project selector dropdown
2. Fetch user projects on mount
3. Implement file filtering by project
4. Add "Link to Project" button and modal
5. Implement link/unlink functionality
6. Add project badge to linked files
7. Modify upload to include project context

### Phase 4: Frontend - PrintHistory (1-2 hours)
1. Add project filter dropdown
2. Fetch project stats when filtered
3. Display stats banner
4. Update history fetch with filter param
5. Add "View All" link to clear filter

### Phase 5: Frontend - ProjectPrintStats (2-3 hours)
1. Create component file
2. Fetch project stats API
3. Build stats grid layout
4. Add recent prints list
5. Implement quick actions
6. Style with charts (optional: recharts)

### Phase 6: Frontend - PrintQueue (30 min)
1. Add project context to queue display
2. Show project badge
3. Test with linked files

### Phase 7: Testing (2-3 hours)
1. Unit tests for permission validation
2. API endpoint tests (link, unlink, filter)
3. Frontend component tests
4. Integration tests (upload → link → print → history)
5. Multi-user permission tests

### Phase 8: Security & UX Review (1-2 hours)
1. Security review: SQL injection, authorization, input validation
2. UX review: workflow intuitiveness, error states, loading states
3. Accessibility review: keyboard navigation, ARIA labels

## Testing Scenarios

### 1. File-Project Association
- Link file to project → Success
- Link file to unauthorized project → 403 error
- Link already-linked file → 409 error
- Unlink file → Success
- Unlink non-existent link → 404 error

### 2. Upload with Project Context
- Upload file with project_id → Auto-linked
- Upload without project_id → Not linked
- Upload to unauthorized project → 403 error

### 3. Filtering & Statistics
- Filter files by project → Shows only project files
- Filter history by project → Shows only project prints
- View project stats → Accurate aggregation
- View stats for project with no prints → Empty state

### 4. Multi-User Scenarios
- User A links file to their project
- User B (not a member) tries to view → 403 error
- User B (member) views → Success
- Project deleted → Files unlinked, prints preserved

### 5. Edge Cases
- File deleted from OctoPrint but linked in DB
- Project deleted while prints in queue
- User removed from project mid-print
- Concurrent file linking attempts

## Success Criteria

1. ✅ Users can link G-code files to projects
2. ✅ Users can filter files by project in FileBrowser
3. ✅ Users can upload files with automatic project linking
4. ✅ Print jobs automatically inherit project from linked files
5. ✅ PrintHistory can be filtered by project
6. ✅ Project pages show print statistics widget
7. ✅ Project permissions are properly enforced
8. ✅ All existing functionality preserved
9. ✅ Comprehensive test coverage
10. ✅ Security review passed

## Risk Assessment

### Technical Risks
- **Database migration failure**: Mitigate with backup and rollback plan
- **Permission logic errors**: Mitigate with comprehensive tests
- **API performance with large datasets**: Add pagination, optimize queries

### UX Risks
- **Workflow too complex**: Mitigate with UX review and user testing
- **Unclear file-project relationship**: Add visual indicators, tooltips

### Security Risks
- **Unauthorized project access**: Mitigate with permission validation
- **SQL injection**: Use parameterized queries
- **File path traversal**: Validate filenames

## Open Questions for Tech Lead

1. **CUID Generation**: Should we use a specific CUID library (cuid, cuid2, or @paralleldrive/cuid2)?
2. **File Uniqueness**: Should a file be linkable to only one project, or multiple?
3. **Cascade Behavior**: When project is deleted, should printing_files be cascade-deleted or preserved?
4. **Permissions Granularity**: Should we check view vs. edit permissions, or just membership?
5. **Pagination Strategy**: What's the preferred pagination approach for /projects/:id/files?
6. **Caching Strategy**: Should we cache project stats or compute on-demand?
7. **WebSocket Updates**: Should file linking trigger real-time updates to other users?
8. **Backwards Compatibility**: How to handle existing print jobs with no file link?

## Next Steps After Approval

1. Create database migration
2. Implement backend endpoints
3. Update frontend components
4. Run security review
5. Run UX review
6. Comprehensive testing
7. Create deployment plan
8. Write user documentation
