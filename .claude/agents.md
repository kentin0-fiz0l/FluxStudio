# FluxStudio Specialized Agent Definitions

This document defines specialized Claude Code agents for FluxStudio development. Each agent is optimized for specific tasks within the FluxStudio ecosystem.

## Table of Contents

1. [fluxstudio-test-coverage](#fluxstudio-test-coverage)
2. [fluxstudio-ai-feature-dev](#fluxstudio-ai-feature-dev)
3. [fluxstudio-collab-debug](#fluxstudio-collab-debug)
4. [fluxstudio-integration-manager](#fluxstudio-integration-manager)
5. [fluxstudio-perf-optimizer](#fluxstudio-perf-optimizer)
6. [fluxstudio-printing-expert](#fluxstudio-printing-expert)
7. [fluxstudio-api-docs](#fluxstudio-api-docs)
8. [fluxstudio-security-auditor](#fluxstudio-security-auditor)

---

## fluxstudio-test-coverage

### Purpose
Systematic test generation and coverage improvement for FluxStudio. This agent specializes in writing comprehensive tests across unit, integration, and end-to-end testing layers.

### Recommended Tools
- **Read**: Analyze existing code to understand testing requirements
- **Write**: Create new test files
- **Edit**: Update existing tests
- **Bash**: Run test suites and check coverage
- **Glob**: Find files needing tests
- **Grep**: Search for untested code paths

### Instructions

When invoked, this agent should:

1. **Analyze Current Coverage**
   ```bash
   npm run test:coverage
   ```

2. **Follow Project Testing Conventions**
   - Unit tests: Use Vitest in `src/**/*.test.{ts,tsx}`
   - Integration tests: Use Jest in `tests/integration/*.test.js`
   - E2E tests: Use Playwright in `tests/e2e/*.spec.ts`

3. **Test File Naming Conventions**
   - Component tests: `ComponentName.test.tsx`
   - Hook tests: `useHookName.test.ts`
   - Service tests: `serviceName.test.ts`

4. **Test Structure Pattern**
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { describe, it, expect, vi } from 'vitest';
   import { MyComponent } from './MyComponent';

   describe('MyComponent', () => {
     it('should render correctly', () => {
       render(<MyComponent />);
       expect(screen.getByRole('button')).toBeInTheDocument();
     });
   });
   ```

5. **Priority Testing Areas**
   - Authentication flows (`src/contexts/AuthContext.tsx`)
   - Real-time collaboration components (`src/components/collaboration/`)
   - API service functions (`src/services/`)

---

## fluxstudio-ai-feature-dev

### Purpose
Implement AI-powered features using Claude/Anthropic API and other AI services.

### Recommended Tools
- **Read**: Analyze existing AI implementation patterns
- **Write/Edit**: Implement AI features
- **Bash**: Test API integrations

### Instructions

1. **Anthropic SDK Usage**
   ```javascript
   const Anthropic = require('@anthropic-ai/sdk');
   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

   const stream = await anthropic.messages.stream({
     model: 'claude-sonnet-4-20250514',
     max_tokens: 4096,
     messages: [{ role: 'user', content: userMessage }],
   });
   ```

2. **Key Files**
   - `/routes/ai.js` - AI API endpoints
   - `/src/components/ai/` - AI assistant components
   - `/services/ai-summary-service.js` - AI utilities
   - `/src/services/aiDesignFeedbackService.ts` - Design analysis

3. **Streaming Pattern**
   ```javascript
   for await (const event of stream) {
     if (event.type === 'content_block_delta') {
       process.stdout.write(event.delta.text);
     }
   }
   ```

4. **Context Building**
   - Include relevant project context
   - Limit context size to avoid token limits
   - Structure prompts for specific design tasks

---

## fluxstudio-collab-debug

### Purpose
Debug real-time collaboration features including Yjs/CRDT synchronization and WebSocket connections.

### Recommended Tools
- **Read**: Analyze collaboration code
- **Bash**: Check WebSocket connections, view logs
- **Grep**: Find sync issues

### Instructions

1. **Architecture**
   - `server-collaboration.js` - Yjs WebSocket server (port 4000)
   - Uses Yjs for CRDT-based conflict-free synchronization
   - Socket.IO namespaces: `/auth`, `/messaging`, `/printing`, `/design-boards`

2. **Debugging Techniques**
   ```javascript
   const ydoc = new Y.Doc();
   ydoc.on('update', (update, origin) => {
     console.log('Update from:', origin);
     console.log('Update size:', update.length);
   });

   provider.awareness.on('change', ({ added, updated, removed }) => {
     console.log('Awareness change:', { added, updated, removed });
   });
   ```

3. **Common Issues Checklist**
   - [ ] WebSocket connection established?
   - [ ] Document synced across clients?
   - [ ] Awareness states updating?
   - [ ] Persistence layer working?
   - [ ] Undo/redo managers initialized?

4. **Key Files**
   - `/server-collaboration.js` - Main Yjs server
   - `/src/components/collaboration/` - Collaboration components
   - `/src/services/collaborationService.ts` - Client-side service

---

## fluxstudio-integration-manager

### Purpose
Manage OAuth integrations with Figma, Slack, and GitHub.

### Recommended Tools
- **Read**: Analyze integration code
- **Edit**: Update integration logic
- **Bash**: Test OAuth flows

### Instructions

1. **OAuth Flow Pattern**
   ```javascript
   router.get('/oauth/:provider', (req, res) => {
     const authUrl = buildAuthUrl(provider, {
       client_id: process.env[`${provider}_CLIENT_ID`],
       redirect_uri: `${BASE_URL}/api/auth/callback/${provider}`,
       scope: getScopes(provider),
     });
     res.redirect(authUrl);
   });
   ```

2. **Key Files**
   - `/routes/auth.js` - OAuth endpoints
   - `/routes/connectors.js` - Integration connectors
   - `/src/components/organisms/FigmaIntegration.tsx`
   - `/src/components/organisms/SlackIntegration.tsx`
   - `/src/components/organisms/GitHubIntegration.tsx`

3. **Token Management**
   - Store tokens securely (encrypted in database)
   - Implement token refresh flows
   - Handle token revocation

4. **Integration-Specific APIs**
   - Figma: Design file access, components, comments
   - Slack: Notifications, channel messaging
   - GitHub: Repository access, webhooks

---

## fluxstudio-perf-optimizer

### Purpose
Performance audits and optimizations for React, bundles, and database queries.

### Recommended Tools
- **Read**: Analyze code for performance issues
- **Edit**: Implement optimizations
- **Bash**: Run bundle analysis, benchmarks

### Instructions

1. **Frontend Analysis**
   ```bash
   npm run build -- --analyze
   npx vite-bundle-visualizer
   ```

2. **React Optimization Patterns**
   ```typescript
   // Memoize expensive components
   const MemoizedComponent = React.memo(ExpensiveComponent);

   // Memoize computed values
   const computed = useMemo(() => expensiveCalculation(data), [data]);

   // Memoize callbacks
   const handleClick = useCallback(() => {
     doSomething(id);
   }, [id]);

   // Virtualize long lists
   import { useVirtualizer } from '@tanstack/react-virtual';
   ```

3. **Lazy Loading Pattern**
   ```typescript
   const LazyComponent = React.lazy(() => import('./HeavyComponent'));

   <Suspense fallback={<Loading />}>
     <LazyComponent />
   </Suspense>
   ```

4. **Database Optimization**
   - Add indexes for frequently queried columns
   - Use connection pooling
   - Implement Redis caching for hot data
   - Analyze query plans with `EXPLAIN ANALYZE`

5. **Key Files**
   - `/src/utils/lazyLoad.ts` - Lazy loading utilities
   - `/vite.config.ts` - Build configuration

---

## fluxstudio-printing-expert

### Purpose
Develop 3D printing features including G-code, STL handling, and printer communication.

### Recommended Tools
- **Read**: Analyze printing code
- **Write/Edit**: Implement printing features
- **Bash**: Test print jobs

### Instructions

1. **Supported Formats**
   ```javascript
   const PRINTABLE_EXTENSIONS = ['stl', 'obj', 'gltf', 'glb', 'gcode', '3mf'];
   ```

2. **Materials and Quality**
   ```javascript
   const VALID_MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'NYLON'];
   const VALID_QUALITIES = ['draft', 'standard', 'high', 'ultra'];
   ```

3. **Print Job Schema**
   ```javascript
   {
     fileId: string,
     material: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'NYLON',
     quality: 'draft' | 'standard' | 'high' | 'ultra',
     copies: number,
     infillDensity: number, // 0-100
     supportsEnabled: boolean,
     notes?: string,
   }
   ```

4. **Key Files**
   - `/routes/printing.js` - Printing API endpoints
   - `/services/printJobLogger.js` - Print job logging
   - `/src/components/printing/` - Printing UI components

---

## fluxstudio-api-docs

### Purpose
Generate and maintain API documentation using OpenAPI/Swagger.

### Recommended Tools
- **Read**: Analyze existing routes
- **Write**: Create documentation files
- **Grep**: Find all API endpoints

### Instructions

1. **Documentation Format**
   ```yaml
   openapi: 3.0.0
   info:
     title: FluxStudio API
     version: 2.0.0
     description: Creative collaboration platform API
   servers:
     - url: https://api.fluxstudio.art
       description: Production
     - url: http://localhost:3001
       description: Local development
   paths:
     /api/auth/login:
       post:
         summary: Authenticate user
         tags: [Authentication]
         requestBody:
           required: true
           content:
             application/json:
               schema:
                 type: object
                 properties:
                   email:
                     type: string
                   password:
                     type: string
         responses:
           200:
             description: Login successful
   ```

2. **Key Files**
   - `/docs/API_DOCUMENTATION.md` - Main API docs
   - `/docs/api/` - API reference files
   - `/routes/*.js` - Route handlers to document

3. **Response Format Standard**
   ```json
   {
     "success": true,
     "data": { ... }
   }

   {
     "success": false,
     "error": "Error message",
     "code": "ERROR_CODE"
   }
   ```

---

## fluxstudio-security-auditor

### Purpose
Security scanning and vulnerability detection following OWASP guidelines.

### Recommended Tools
- **Read**: Analyze code for vulnerabilities
- **Grep**: Find security anti-patterns
- **Bash**: Run security scans

### Instructions

1. **OWASP Top 10 Checklist**
   - [ ] Injection (SQL, NoSQL, Command)
   - [ ] Broken Authentication
   - [ ] Sensitive Data Exposure
   - [ ] XML External Entities (XXE)
   - [ ] Broken Access Control
   - [ ] Security Misconfiguration
   - [ ] Cross-Site Scripting (XSS)
   - [ ] Insecure Deserialization
   - [ ] Using Components with Known Vulnerabilities
   - [ ] Insufficient Logging & Monitoring

2. **Security Patterns**
   ```javascript
   // SQL Injection Prevention
   query('SELECT * FROM users WHERE id = $1', [userId]);

   // XSS Prevention
   import DOMPurify from 'dompurify';
   element.innerHTML = DOMPurify.sanitize(userInput);

   // CSRF Protection
   app.use(csrfMiddleware);

   // Rate Limiting
   app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
   ```

3. **Dependency Scanning**
   ```bash
   npm audit
   npm audit fix
   npm outdated
   ```

4. **Key Files**
   - `/lib/security/` - Security utilities
   - `/middleware/security.js` - Security middleware
   - `/lib/auth/` - Authentication logic

5. **Security Anti-Patterns to Find**
   ```bash
   # Find eval usage
   grep -r "eval(" --include="*.js" --include="*.ts"

   # Find innerHTML usage
   grep -r "innerHTML" --include="*.tsx" --include="*.jsx"

   # Find hardcoded secrets
   grep -r "password.*=" --include="*.js"
   ```

---

## Usage Guide

### Invoking Agents
Reference the agent purpose and follow specific instructions when working on related tasks.

### Agent Collaboration
- **Security + Test Coverage**: Write tests after security fixes
- **AI Feature Dev + Integration Manager**: AI features with external services
- **Perf Optimizer + Collab Debug**: Real-time performance optimization
- **API Docs + All Agents**: Document new features after implementation
