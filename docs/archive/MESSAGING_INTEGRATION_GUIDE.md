# Messaging Architecture Integration Guide

## Overview

This guide explains how to integrate and use the comprehensive messaging architecture that has been implemented for FluxStudio. The system provides AI-powered communication, real-time collaboration, and intelligent workflow orchestration.

## Components Overview

### 🧠 Core Intelligence Layer

#### 1. MessageIntelligenceService
**Location**: `src/services/messageIntelligenceService.ts`

**Purpose**: AI-powered message analysis and classification

**Key Features**:
- Smart message categorization (design-feedback, approval-request, question, etc.)
- Priority inference and urgency assessment
- Automated action item extraction
- Deadline recognition from text
- Emotion detection and sentiment analysis
- Contextual response suggestions

**Usage**:
```typescript
import { messageIntelligenceService } from '../services/messageIntelligenceService';

const analysis = await messageIntelligenceService.analyzeMessage(message, conversation);
```

#### 2. IntelligentMessageCard
**Location**: `src/components/messaging/IntelligentMessageCard.tsx`

**Purpose**: Enhanced message display with AI analysis visualization

**Key Features**:
- Real-time message analysis display
- Extracted data highlighting (action items, deadlines, questions)
- Smart response suggestions
- Priority and urgency indicators
- Expandable detailed analysis

**Usage**:
```tsx
<IntelligentMessageCard
  message={message}
  conversation={conversation}
  currentUserId={currentUser.id}
  onResponseSelect={(response) => handleResponseSelect(response)}
  onActionTrigger={(action) => handleActionTrigger(action)}
  showAnalysis={true}
/>
```

#### 3. ConversationIntelligencePanel
**Location**: `src/components/messaging/ConversationIntelligencePanel.tsx`

**Purpose**: AI-powered conversation insights and analytics

**Key Features**:
- Conversation health metrics
- Workflow automation suggestions
- Smart notifications and alerts
- Performance analytics
- Team collaboration insights

**Usage**:
```tsx
<ConversationIntelligencePanel
  conversations={conversations}
  currentUser={currentUser}
  onWorkflowSuggestion={(suggestion) => handleWorkflowSuggestion(suggestion)}
  onNotificationCreate={(notification) => handleNotificationCreate(notification)}
/>
```

### 🎨 Visual Collaboration Engine

#### 4. RealtimeImageAnnotation
**Location**: `src/components/messaging/RealtimeImageAnnotation.tsx`

**Purpose**: Advanced image annotation with real-time collaboration

**Key Features**:
- Multi-user real-time annotation
- Advanced drawing tools (point, rectangle, circle, arrow, text, freehand)
- Live cursor tracking
- Layer management
- Zoom and pan controls
- Undo/redo functionality
- WebSocket-based collaboration

**Usage**:
```tsx
<RealtimeImageAnnotation
  imageUrl={imageUrl}
  annotations={annotations}
  currentUser={currentUser}
  onAnnotationsChange={(annotations) => setAnnotations(annotations)}
  conversationId={conversationId}
  fileVersionId={fileVersionId}
  collaborators={collaborators}
/>
```

#### 5. VersionAwareMessaging
**Location**: `src/components/messaging/VersionAwareMessaging.tsx`

**Purpose**: File version tracking tied to conversations

**Key Features**:
- Version timeline with playback controls
- Thread tracking for design evolution
- Conversation linking across versions
- Milestone tracking
- Interactive version comparison
- Search and filtering capabilities

**Usage**:
```tsx
<VersionAwareMessaging
  conversationId={conversationId}
  currentUser={currentUser}
  onVersionSelect={(version) => handleVersionSelect(version)}
  onConversationNavigate={(id) => navigateToConversation(id)}
/>
```

#### 6. VisualCollaborationHub
**Location**: `src/components/messaging/VisualCollaborationHub.tsx`

**Purpose**: Multi-user design review sessions

**Key Features**:
- Video/audio integration
- Screen sharing
- Session recording
- Participant management
- Role-based permissions
- Real-time session controls
- Quality monitoring

**Usage**:
```tsx
<VisualCollaborationHub
  sessionId={sessionId}
  currentUser={currentUser}
  onSessionEnd={() => handleSessionEnd()}
  onParticipantAdd={(user) => handleParticipantAdd(user)}
  onAssetUpload={(file) => handleAssetUpload(file)}
/>
```

### 🔄 Workflow Orchestration

#### 7. WorkflowOrchestrator
**Location**: `src/components/messaging/WorkflowOrchestrator.tsx`

**Purpose**: AI-powered workflow automation and management

**Key Features**:
- Template-based workflow creation
- Automated task scheduling
- AI-powered bottleneck detection
- Performance analytics
- Team efficiency tracking
- Smart recommendations

**Usage**:
```tsx
<WorkflowOrchestrator
  projectId={projectId}
  currentUser={currentUser}
  onTaskAssign={(taskId, userId) => handleTaskAssign(taskId, userId)}
  onWorkflowStart={(workflowId) => handleWorkflowStart(workflowId)}
  onTaskComplete={(taskId) => handleTaskComplete(taskId)}
/>
```

### 📝 Enhanced Core Components

#### 8. EnhancedMessageHub
**Location**: `src/components/messaging/EnhancedMessageHub.tsx`

**Purpose**: Central messaging interface with all intelligent features

**Key Features**:
- Integrated AI analysis
- Smart conversation grouping
- Priority-based filtering
- Real-time collaboration
- Workflow integration

**Usage**:
```tsx
<EnhancedMessageHub
  currentUser={currentUser}
  onConversationSelect={(id) => setActiveConversation(id)}
  onMessageSend={(message) => handleMessageSend(message)}
/>
```

## Integration Steps

### 1. Basic Setup

#### Install Required Dependencies
The following dependencies should already be installed, but verify:

```bash
npm install framer-motion lucide-react
npm install @radix-ui/react-tabs @radix-ui/react-popover
npm install @radix-ui/react-slider @radix-ui/react-switch
```

#### Import Types
```typescript
import {
  Message,
  Conversation,
  MessageUser,
  ImageAnnotation
} from '../types/messaging';
```

### 2. Context Integration

#### Setup Messaging Context
```typescript
// In your main app component
import { MessagingProvider } from '../contexts/MessagingContext';

<MessagingProvider>
  <YourApp />
</MessagingProvider>
```

### 3. WebSocket Setup for Real-time Features

#### Server-side WebSocket Handler
```javascript
// Example WebSocket server setup (Node.js)
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost:8080');
  const room = url.pathname.split('/')[2]; // e.g., /annotation/room-id

  ws.room = room;

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    // Broadcast to all clients in the same room
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN && client.room === room) {
        client.send(JSON.stringify(message));
      }
    });
  });
});
```

### 4. Database Schema Considerations

#### Required Tables/Collections

**Messages Table**:
```sql
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  author_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'sent',
  priority VARCHAR(20) DEFAULT 'medium',
  analysis_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Annotations Table**:
```sql
CREATE TABLE annotations (
  id VARCHAR(255) PRIMARY KEY,
  message_id VARCHAR(255),
  file_id VARCHAR(255),
  x DECIMAL(10,2) NOT NULL,
  y DECIMAL(10,2) NOT NULL,
  width DECIMAL(10,2),
  height DECIMAL(10,2),
  type VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL,
  content TEXT,
  path JSON,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Workflows Table**:
```sql
CREATE TABLE workflows (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  template_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  progress DECIMAL(5,2) DEFAULT 0,
  settings JSON,
  metrics JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 5. API Endpoints

#### Message Intelligence
```typescript
// POST /api/messages/analyze
interface AnalyzeMessageRequest {
  messageId: string;
  content: string;
  conversationContext: Conversation;
}

interface AnalyzeMessageResponse {
  analysis: MessageAnalysis;
}
```

#### Annotation Sync
```typescript
// POST /api/annotations
// PUT /api/annotations/:id
// DELETE /api/annotations/:id
// GET /api/annotations/file/:fileId
```

#### Workflow Management
```typescript
// POST /api/workflows
// GET /api/workflows/project/:projectId
// PUT /api/workflows/:id/tasks/:taskId
// POST /api/workflows/templates
```

## Configuration

### Environment Variables
```bash
# WebSocket Configuration
WEBSOCKET_PORT=8080
WEBSOCKET_HOST=localhost

# AI Analysis Configuration
ENABLE_MESSAGE_ANALYSIS=true
ANALYSIS_CONFIDENCE_THRESHOLD=0.7

# Collaboration Configuration
MAX_COLLABORATORS_PER_SESSION=10
SESSION_TIMEOUT_MINUTES=60

# File Upload Configuration
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=png,jpg,jpeg,gif,pdf,figma,sketch
```

### Feature Toggles
```typescript
// src/config/features.ts
export const features = {
  messageIntelligence: true,
  realtimeCollaboration: true,
  workflowOrchestration: true,
  visualAnnotations: true,
  versionTracking: true,
  videoCollaboration: false, // Requires additional setup
};
```

## Usage Examples

### 1. Basic Message Display with Intelligence
```tsx
import { IntelligentMessageCard } from '../components/messaging/IntelligentMessageCard';

function ChatView({ messages, conversation, currentUser }) {
  return (
    <div className="chat-container">
      {messages.map(message => (
        <IntelligentMessageCard
          key={message.id}
          message={message}
          conversation={conversation}
          currentUserId={currentUser.id}
          showAnalysis={true}
          onResponseSelect={(response) => {
            // Handle quick response selection
            sendMessage(response);
          }}
          onActionTrigger={(action) => {
            // Handle workflow triggers
            executeWorkflowAction(action);
          }}
        />
      ))}
    </div>
  );
}
```

### 2. File Review with Real-time Annotation
```tsx
import { RealtimeImageAnnotation } from '../components/messaging/RealtimeImageAnnotation';

function FileReviewPage({ file, currentUser, collaborators }) {
  const [annotations, setAnnotations] = useState(file.annotations || []);

  return (
    <RealtimeImageAnnotation
      imageUrl={file.url}
      annotations={annotations}
      currentUser={currentUser}
      collaborators={collaborators}
      onAnnotationsChange={(newAnnotations) => {
        setAnnotations(newAnnotations);
        // Sync to backend
        syncAnnotations(file.id, newAnnotations);
      }}
      conversationId={file.conversationId}
      fileVersionId={file.versionId}
    />
  );
}
```

### 3. Project Workflow Management
```tsx
import { WorkflowOrchestrator } from '../components/messaging/WorkflowOrchestrator';

function ProjectDashboard({ project, currentUser }) {
  return (
    <WorkflowOrchestrator
      projectId={project.id}
      currentUser={currentUser}
      onTaskAssign={(taskId, userId) => {
        // Handle task assignment
        assignTask(taskId, userId);
      }}
      onWorkflowStart={(workflowId) => {
        // Handle workflow initiation
        startWorkflow(workflowId, project.id);
      }}
      onTaskComplete={(taskId) => {
        // Handle task completion
        completeTask(taskId);
      }}
    />
  );
}
```

## Performance Considerations

### 1. Code Splitting
The messaging components are large. Consider lazy loading:

```tsx
const EnhancedMessageHub = lazy(() => import('../components/messaging/EnhancedMessageHub'));
const WorkflowOrchestrator = lazy(() => import('../components/messaging/WorkflowOrchestrator'));
```

### 2. WebSocket Connection Management
- Implement connection pooling for multiple conversations
- Add automatic reconnection logic
- Use heartbeat/ping-pong for connection health

### 3. Annotation Performance
- Implement virtualization for large annotation sets
- Use canvas pooling for complex drawings
- Debounce annotation updates to reduce server load

## Security Considerations

### 1. Permission Validation
Always validate user permissions before:
- Creating/editing annotations
- Starting workflows
- Accessing file versions
- Joining collaboration sessions

### 2. Input Sanitization
- Sanitize all message content
- Validate annotation coordinates
- Escape HTML in user-generated content

### 3. Rate Limiting
- Implement rate limiting for message sending
- Limit annotation creation frequency
- Throttle real-time updates

## Monitoring and Analytics

### 1. Key Metrics to Track
- Message analysis accuracy
- Collaboration session quality
- Workflow completion rates
- User engagement metrics
- Performance benchmarks

### 2. Error Handling
- Graceful degradation when AI analysis fails
- Fallback for WebSocket connection issues
- Retry logic for failed operations

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed
- Check firewall settings
- Verify WebSocket server is running
- Ensure correct ports are open

#### 2. Annotations Not Syncing
- Verify user permissions
- Check WebSocket connection
- Validate annotation data format

#### 3. AI Analysis Not Working
- Check service configuration
- Verify analysis thresholds
- Review message content format

#### 4. Performance Issues
- Enable React DevTools Profiler
- Check for memory leaks in WebSocket listeners
- Monitor bundle size and loading times

## Future Enhancements

### Planned Features
1. **Voice Message Analysis**: AI-powered voice message transcription and analysis
2. **Smart Templates**: AI-generated workflow templates based on project patterns
3. **Predictive Scheduling**: ML-powered task scheduling optimization
4. **Advanced Analytics**: Deep learning insights for team performance
5. **Mobile Optimization**: React Native components for mobile collaboration

### Integration Roadmap
1. **Phase 1**: Basic messaging with AI analysis (✅ Complete)
2. **Phase 2**: Real-time collaboration features (✅ Complete)
3. **Phase 3**: Workflow orchestration (✅ Complete)
4. **Phase 4**: Advanced analytics and reporting (Planned)
5. **Phase 5**: Mobile and offline support (Planned)

---

This messaging architecture provides a comprehensive foundation for modern design collaboration. The modular design allows for incremental adoption and easy customization based on specific project needs.