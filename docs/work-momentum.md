# Work Momentum

> "Pick up exactly where you left off."

Work Momentum is a feature that automatically tracks and restores your working context within focused projects. When you return to FluxStudio after being away, you can resume your previous work with a single click.

## Overview

Work Momentum captures:
- **Last Route**: The page you were viewing (Messages, Files, Assets, etc.)
- **Last Entity**: The specific item you were working with (conversation, file, asset, board)
- **Timestamp**: When you were last active
- **Intent Note** (optional): A breadcrumb note you leave for yourself

## How It Works

### Automatic Capture
When you have a project focused (via the "Focus" button), Work Momentum passively captures your context as you navigate:

1. Route changes are tracked automatically
2. Entity selections are captured (opening a conversation, previewing a file, etc.)
3. Context is saved to localStorage per project
4. Writes are debounced to avoid performance impact

### Resume Flow
When you return to a focused project:

1. Open the Project Pulse panel (click the Pulse indicator in the context bar)
2. If resumable context exists, you'll see a "Pick up where you left off" card
3. Click **Resume** to navigate back to your previous location
4. Or dismiss the card to start fresh

### Intent Notes
You can leave yourself a breadcrumb note:

1. In the Resume Card, click "Add a note"
2. Type what you were working on (e.g., "Reviewing Sarah's feedback on logo v3")
3. The note appears next time you see the Resume Card

## Architecture

### Files
- `src/contexts/WorkingContext.tsx` - Context provider and persistence
- `src/hooks/useWorkMomentumCapture.ts` - Passive capture hook
- `src/components/momentum/MomentumCapture.tsx` - App-level capture component
- `src/components/momentum/ResumeCard.tsx` - Resume UI
- `src/components/momentum/IntentNoteInline.tsx` - Intent note editor

### Data Model
```typescript
interface WorkingContextData {
  projectId: string;
  lastRoute: string;
  lastEntity: {
    conversationId?: string;
    messageId?: string;
    fileId?: string;
    assetId?: string;
    boardId?: string;
  };
  lastSeenAt: string;
  intentNote?: string;
  version: number;
}
```

### Storage
- Key format: `fluxstudio.workingContext.{projectId}`
- Stored in localStorage
- Versioned for future migrations
- Context older than 30 days is considered non-resumable

## Manual Test Plan

### Prerequisites
- FluxStudio running locally
- At least one project created
- Test content: conversations, files, assets, or boards

### Test Cases

#### TC1: Basic Context Capture
1. Focus on a project (click "Focus" on project card or detail page)
2. Navigate to Messages and select a conversation
3. Open browser DevTools > Application > Local Storage
4. Verify key `fluxstudio.workingContext.{projectId}` exists
5. Verify `lastRoute` contains `/messages`
6. Verify `lastEntity.conversationId` is set

#### TC2: Resume Flow
1. Complete TC1
2. Refresh the page or close/reopen the browser
3. Focus on the same project
4. Click the Pulse indicator (badge in context bar)
5. Verify Resume Card appears with correct route name
6. Click "Resume"
7. Verify navigation to the Messages page with the conversation selected

#### TC3: Intent Note
1. Complete TC1
2. Open Pulse panel
3. In the Resume Card, click "Add a note"
4. Enter: "Working on project brief"
5. Press Enter or click away
6. Refresh the page
7. Open Pulse panel
8. Verify the note appears in the Resume Card

#### TC4: Context Staleness
1. In DevTools, manually edit the localStorage entry
2. Set `lastSeenAt` to 31+ days ago
3. Refresh the page
4. Open Pulse panel
5. Verify Resume Card does NOT appear

#### TC5: Cross-Entity Capture
1. Focus on a project
2. Go to Files, preview a file
3. Check localStorage: `lastEntity.fileId` should be set
4. Go to Assets, click an asset
5. Check localStorage: `lastEntity.assetId` should be set
6. Go to a Design Board
7. Check localStorage: `lastEntity.boardId` should be set

#### TC6: Exit Focus Clears Context Display
1. Complete TC1
2. Click "Exit Focus" in context bar
3. Open a new focus on a different project
4. Open Pulse panel
5. Verify Resume Card shows context for the NEW project (or nothing if no prior context)

#### TC7: Dismiss Resume Card
1. Complete TC2 setup (have resumable context)
2. Open Pulse panel
3. Click the X button on Resume Card
4. Verify card disappears
5. Check localStorage: entry should be removed
6. Refresh page
7. Verify Resume Card does not appear

### Edge Cases

#### EC1: No Project Focused
1. Exit any focused project
2. Navigate around the app
3. Verify NO context is captured (check localStorage)

#### EC2: Deleted Entity
1. Capture context with a conversation
2. Delete the conversation via API or DB
3. Use Resume
4. Verify graceful handling (page loads but entity may not be found)

#### EC3: Different Browser/Device
1. Capture context in Browser A
2. Open FluxStudio in Browser B
3. Focus same project
4. Verify Resume Card does NOT show (localStorage is per-browser)

## Performance Considerations

- Context writes are debounced (1000ms for context, 500ms for captures)
- No network requests (all localStorage)
- Minimal re-renders (context only updates on actual changes)
- Stale contexts auto-expire after 30 days

## Future Enhancements

- Cloud sync of context (opt-in)
- Multiple context "slots" per project
- Team-visible "where I left off" indicators
- Voice note breadcrumbs
- Integration with task/todo systems
