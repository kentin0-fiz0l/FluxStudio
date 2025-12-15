# User Test Mode: Project Focus + Pulse

A lightweight, production-safe user testing harness for evaluating the Active Project Context and Project Pulse features.

## Overview

User Test Mode provides a structured way to gather feedback from testers without external dependencies. All telemetry is stored locally in the browser's localStorage and can be exported as Markdown (for GitHub issues) or JSON (for analysis).

## Enabling User Test Mode

### Via URL Parameter
Add `?usertest=1` to any FluxStudio URL:
```
https://app.fluxstudio.io/projects?usertest=1
```

### Persistence
Once enabled, the mode persists in localStorage (`fluxstudio_usertest=true`) until explicitly disabled or reset.

## Features

### User Test Pill
When enabled, a small amber pill appears in the top bar header showing:
- "User Test" label
- Progress indicator (e.g., "3/7" completed tasks)

Click the pill to open the User Test Panel.

### User Test Panel
A slide-over panel with three tabs:

#### 1. Info Tab
Collect tester information:
- **Name** (optional): Tester's name for identification
- **Role**: Designer, Student, Teacher, or Other
- **Experience**: New to FluxStudio or Returning user

#### 2. Tasks Tab
Seven structured tasks to test Project Focus + Pulse features:

| Task | Description |
|------|-------------|
| Focus on a project | Open Project Dashboard and click a project card |
| See Pulse badge | After focusing, look for the Pulse indicator in the header |
| Open Pulse panel | Click the Pulse button to open the activity panel |
| Read activity stream | Switch to the Activity tab and review recent events |
| Mark attention item done | Complete an item in the Needs Attention tab |
| Switch project focus | Navigate to a different project and observe updates |
| Persist focus | Refresh the page and confirm focus is maintained |

Each task has three actions:
- **Start**: Mark the task as in-progress (starts timing)
- **Complete**: Mark as successfully completed (stops timing)
- **Stuck**: Mark as blocked with optional notes

#### 3. Feedback Tab
Collect qualitative feedback:
- **Top Confusions**: Free-text list of confusing elements
- **Clarity Rating**: 1-10 scale
- **Speed Rating**: 1-10 scale
- **Delight Rating**: 1-10 scale
- **Additional Comments**: Open feedback

### Report Generation

#### Markdown Report
Click "Copy Report" to copy a GitHub-ready markdown report including:
- Test session metadata
- Tester information
- Task outcomes with timing
- Feedback ratings
- Event telemetry summary

#### JSON Export
Click "Download JSON" to save all test data for analysis.

## Telemetry Events

The following events are captured (client-side only):

| Event Name | When Captured |
|------------|---------------|
| `usertest_enabled` | Test mode activated |
| `route_change` | Navigation between pages |
| `task_started` | Tester starts a task |
| `task_completed` | Tester completes a task |
| `task_stuck` | Tester marks a task as stuck |
| `tester_info_saved` | Tester info form submitted |
| `feedback_submitted` | Feedback form submitted |
| `report_copied` | Markdown report copied to clipboard |
| `json_exported` | JSON data downloaded |
| `test_reset` | Test session reset |

### Privacy Considerations
- No message content is ever logged
- Arrays are converted to counts only
- Sensitive keys (content, message, password, token, secret) are redacted
- All data stays in localStorage - never sent externally

## Integration Points

### Files
- `src/services/userTestLogger.ts` - Telemetry logging service
- `src/hooks/useUserTestMode.ts` - React hook for test mode state
- `src/components/usertest/UserTestPanel.tsx` - Main panel component
- `src/components/usertest/UserTestPill.tsx` - Header indicator
- `src/components/organisms/TopBar.tsx` - Integration point

### Adding Custom Events
```typescript
import { useUserTestMode } from '@/hooks/useUserTestMode';

function MyComponent() {
  const { logEvent } = useUserTestMode();

  const handleAction = () => {
    logEvent('custom_action', {
      actionType: 'click',
      targetId: 'my-button'
    });
  };
}
```

## Manual Test Checklist

Before shipping, verify:

- [ ] Add `?usertest=1` to URL - amber pill appears in header
- [ ] Click pill - panel opens with three tabs
- [ ] Fill out tester info - saves and shows in Info tab
- [ ] Start a task - shows "In Progress" status
- [ ] Complete a task - shows checkmark and time taken
- [ ] Mark task as stuck - shows stuck status with notes
- [ ] View progress bar - updates as tasks complete
- [ ] Switch to Feedback tab - ratings work (1-10 sliders)
- [ ] Submit feedback - saves and shows confirmation
- [ ] Click "Copy Report" - markdown copied to clipboard
- [ ] Click "Download JSON" - file downloads
- [ ] Click "Reset" - clears all test data
- [ ] Refresh page - test mode persists (pill still visible)
- [ ] Navigate to different pages - events logged
- [ ] Press Escape with panel open - panel closes

## Resetting Test Data

Click the "Reset" button in the panel footer to clear:
- All logged events
- Tester information
- Task outcomes
- Feedback ratings
- Test mode enabled state

This returns the app to a fresh state for the next tester.
