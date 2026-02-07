/**
 * Agent Service Unit Tests
 * @file services/__tests__/agent-service.test.js
 *
 * Tests all exported functions from agent-service.js with mocked dependencies.
 * Uses Jest for backend unit testing.
 */

// Create mock functions that persist
const mockQuery = jest.fn();
const mockGenerateCuid = jest.fn(() => 'test-cuid-123');
const mockMessagesCreate = jest.fn();

// Mock database config BEFORE requiring agent-service
jest.mock('../../database/config', () => ({
  query: mockQuery,
  generateCuid: mockGenerateCuid,
}));

// Mock Anthropic SDK BEFORE requiring agent-service
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  }));
});

// Now require the service - mocks are already in place
const agentService = require('../agent-service');

// Alias for cleaner test code
const query = mockQuery;
const generateCuid = mockGenerateCuid;

describe('Agent Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment for Anthropic client
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  // ============================================================================
  // searchProjects
  // ============================================================================

  describe('searchProjects', () => {
    const mockProjects = [
      {
        id: 'proj-1',
        title: 'Project Alpha',
        description: 'First project',
        status: 'active',
        type: 'design',
        client_name: 'Test User',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
      },
      {
        id: 'proj-2',
        title: 'Project Beta',
        description: 'Second project',
        status: 'completed',
        type: 'branding',
        client_name: 'Test User',
        createdAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-01-20'),
      },
    ];

    it('should return matching projects for valid query', async () => {
      query.mockResolvedValue({ rows: mockProjects });

      const results = await agentService.searchProjects('user-1', 'Project');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['user-1', 'Project', 10, 0]
      );
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'proj-1',
        name: 'Project Alpha',
        description: 'First project',
        status: 'active',
        type: 'design',
        clientName: 'Test User',
        createdAt: mockProjects[0].createdAt,
        updatedAt: mockProjects[0].updatedAt,
      });
    });

    it('should return empty array for empty query', async () => {
      query.mockResolvedValue({ rows: [] });

      const results = await agentService.searchProjects('user-1', '');

      expect(results).toHaveLength(0);
    });

    it('should respect pagination options', async () => {
      query.mockResolvedValue({ rows: [mockProjects[1]] });

      const results = await agentService.searchProjects('user-1', 'Project', {
        limit: 1,
        offset: 1,
      });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 'Project', 1, 1]
      );
      expect(results).toHaveLength(1);
    });

    it('should return empty array on database error', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const results = await agentService.searchProjects('user-1', 'test');

      expect(results).toEqual([]);
    });

    it('should be safe against SQL injection', async () => {
      query.mockResolvedValue({ rows: [] });

      await agentService.searchProjects('user-1', "'; DROP TABLE projects; --");

      // Verify parameterized query is used
      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', "'; DROP TABLE projects; --", 10, 0]
      );
    });
  });

  // ============================================================================
  // getProject
  // ============================================================================

  describe('getProject', () => {
    const mockProject = {
      id: 'proj-1',
      title: 'Test Project',
      description: 'A test project',
      status: 'active',
      type: 'design',
      client_name: 'John Doe',
      client_email: 'john@example.com',
      startDate: new Date('2026-01-01'),
      dueDate: new Date('2026-03-01'),
      budget: 5000,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-15'),
    };

    it('should return project for valid ID and user', async () => {
      query.mockResolvedValue({ rows: [mockProject] });

      const result = await agentService.getProject('user-1', 'proj-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.id = $2'),
        ['user-1', 'proj-1']
      );
      expect(result).toEqual({
        id: 'proj-1',
        name: 'Test Project',
        description: 'A test project',
        status: 'active',
        type: 'design',
        clientName: 'John Doe',
        clientEmail: 'john@example.com',
        startDate: mockProject.startDate,
        dueDate: mockProject.dueDate,
        budget: 5000,
        createdAt: mockProject.createdAt,
        updatedAt: mockProject.updatedAt,
      });
    });

    it('should return null for non-existent project', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await agentService.getProject('user-1', 'invalid-id');

      expect(result).toBeNull();
    });

    it('should enforce user ownership check', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await agentService.getProject('different-user', 'proj-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('p."clientId" = $1'),
        ['different-user', 'proj-1']
      );
      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const result = await agentService.getProject('user-1', 'proj-1');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // listProjects
  // ============================================================================

  describe('listProjects', () => {
    const mockProjects = [
      {
        id: 'proj-1',
        title: 'Project One',
        description: 'First',
        status: 'active',
        type: 'design',
        startDate: new Date('2026-01-01'),
        dueDate: new Date('2026-03-01'),
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-15'),
      },
    ];

    it('should return all user projects', async () => {
      query.mockResolvedValue({ rows: mockProjects });

      const results = await agentService.listProjects('user-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p."clientId" = $1'),
        ['user-1', 20, 0]
      );
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Project One');
    });

    it('should filter by status when provided', async () => {
      query.mockResolvedValue({ rows: mockProjects });

      await agentService.listProjects('user-1', { status: 'active' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND p.status = $2'),
        ['user-1', 'active', 20, 0]
      );
    });

    it('should respect pagination options', async () => {
      query.mockResolvedValue({ rows: [] });

      await agentService.listProjects('user-1', { limit: 5, offset: 10 });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 5, 10]
      );
    });

    it('should return empty array on error', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const results = await agentService.listProjects('user-1');

      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // getActivityFeed
  // ============================================================================

  describe('getActivityFeed', () => {
    const mockActivity = [
      {
        type: 'project',
        id: 'proj-1',
        name: 'Project Alpha',
        status: 'active',
        timestamp: new Date('2026-01-15'),
        action: 'updated',
      },
    ];

    it('should return recent activity', async () => {
      query.mockResolvedValue({ rows: mockActivity });

      const results = await agentService.getActivityFeed('user-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM projects p'),
        ['user-1', 20]
      );
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('project');
    });

    it('should filter by since timestamp', async () => {
      query.mockResolvedValue({ rows: mockActivity });
      const since = '2026-01-10T00:00:00Z';

      await agentService.getActivityFeed('user-1', { since });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('p."updatedAt" > $2'),
        ['user-1', since, 20]
      );
    });

    it('should respect limit option', async () => {
      query.mockResolvedValue({ rows: mockActivity });

      await agentService.getActivityFeed('user-1', { limit: 5 });

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 5]
      );
    });

    it('should return empty array on error', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const results = await agentService.getActivityFeed('user-1');

      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // whatChanged
  // ============================================================================

  describe('whatChanged', () => {
    it('should return change summary for period', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 'proj-1', title: 'Project A', status: 'active', updatedAt: new Date() },
          ],
        });

      const result = await agentService.whatChanged('user-1', '2026-01-01T00:00:00Z');

      expect(result.summary.projectUpdates).toBe(3);
      expect(result.changes.projects).toHaveLength(1);
    });

    it('should default to 24 hours when since is not provided', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await agentService.whatChanged('user-1');

      expect(result.since).toBeDefined();
      const sinceDate = new Date(result.since);
      const now = Date.now();
      const diff = now - sinceDate.getTime();
      // Should be approximately 24 hours (within 1 minute tolerance)
      expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
    });

    it('should handle no changes gracefully', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await agentService.whatChanged('user-1');

      expect(result.summary.projectUpdates).toBe(0);
      expect(result.changes.projects).toEqual([]);
    });

    it('should return default structure on error', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const result = await agentService.whatChanged('user-1');

      expect(result.summary).toEqual({
        projectUpdates: 0,
        newMessages: 0,
        newAssets: 0,
        notifications: 0,
      });
    });
  });

  // ============================================================================
  // generateDailyBrief
  // ============================================================================

  describe('generateDailyBrief', () => {
    it('should generate AI-powered brief', async () => {
      // Mock listProjects response
      query
        .mockResolvedValueOnce({
          rows: [
            { id: 'proj-1', title: 'Active Project', status: 'active' },
          ],
        })
        // Mock whatChanged count query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        // Mock whatChanged projects query
        .mockResolvedValueOnce({ rows: [] });

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Good morning! You have 1 active project.' }],
      });

      const result = await agentService.generateDailyBrief('user-1');

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          max_tokens: 200,
          messages: expect.any(Array),
        })
      );
      expect(result.brief).toBe('Good morning! You have 1 active project.');
      expect(result.activeProjectCount).toBe(1);
    });

    it('should handle user with no projects', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await agentService.generateDailyBrief('user-1');

      expect(result.brief).toContain("don't have any projects");
      expect(result.activeProjectCount).toBe(0);
    });

    it('should handle API errors gracefully', async () => {
      query.mockResolvedValue({
        rows: [{ id: 'proj-1', title: 'Test', status: 'active' }],
      });
      mockMessagesCreate.mockRejectedValue(new Error('API error'));

      const result = await agentService.generateDailyBrief('user-1');

      expect(result.brief).toContain('Unable to generate summary');
      expect(result.activeProjectCount).toBe(0);
    });

    it('should include correct stats', async () => {
      query
        .mockResolvedValueOnce({
          rows: [
            { id: 'proj-1', title: 'Active', status: 'active' },
            { id: 'proj-2', title: 'Completed', status: 'COMPLETED' },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Test brief' }],
      });

      const result = await agentService.generateDailyBrief('user-1');

      expect(result.stats.projectUpdates).toBe(5);
      expect(result.activeProjectCount).toBe(1);
    });
  });

  // ============================================================================
  // chat
  // ============================================================================

  describe('chat', () => {
    it('should return streaming response', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello! How can I help you?' }],
      });

      const result = await agentService.chat('user-1', 'session-1', 'Hello');

      expect(result.content).toBe('Hello! How can I help you?');
      expect(result.toolsUsed).toEqual([]);
    });

    it('should execute tools when needed', async () => {
      // First call - model requests tool use
      mockMessagesCreate
        .mockResolvedValueOnce({
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'list_projects', input: {} },
          ],
        })
        // Second call - model responds with tool result
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Here are your 2 projects...' }],
        });

      // Mock the listProjects database call
      query.mockResolvedValue({
        rows: [
          { id: 'p1', title: 'Proj 1', status: 'active' },
          { id: 'p2', title: 'Proj 2', status: 'completed' },
        ],
      });

      const result = await agentService.chat('user-1', 'session-1', 'List my projects');

      expect(result.toolsUsed).toContain('list_projects');
      expect(result.content).toContain('projects');
    });

    it('should handle tool errors gracefully', async () => {
      mockMessagesCreate
        .mockResolvedValueOnce({
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'unknown_tool', input: {} },
          ],
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'I encountered an error.' }],
        });

      const result = await agentService.chat('user-1', 'session-1', 'Do something unknown');

      expect(result.toolsUsed).toContain('unknown_tool');
    });

    it('should include project context when provided', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Looking at project X...' }],
      });

      await agentService.chat('user-1', 'session-1', 'What about this project?', {
        projectId: 'proj-123',
      });

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('proj-123'),
        })
      );
    });

    it('should throw on API error', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('API unavailable'));

      await expect(
        agentService.chat('user-1', 'session-1', 'Hello')
      ).rejects.toThrow('API unavailable');
    });
  });

  // ============================================================================
  // Session Management
  // ============================================================================

  describe('createSession', () => {
    it('should create new session with generated ID', async () => {
      query.mockResolvedValue({});

      const result = await agentService.createSession('user-1');

      expect(generateCuid).toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_sessions'),
        expect.arrayContaining(['test-cuid-123', 'user-1'])
      );
      expect(result.id).toBe('test-cuid-123');
      expect(result.userId).toBe('user-1');
    });

    it('should include projectId when provided', async () => {
      query.mockResolvedValue({});

      const result = await agentService.createSession('user-1', 'proj-1');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['proj-1'])
      );
      expect(result.projectId).toBe('proj-1');
    });

    it('should throw on database error', async () => {
      query.mockRejectedValue(new Error('Insert failed'));

      await expect(agentService.createSession('user-1')).rejects.toThrow('Insert failed');
    });
  });

  describe('getSession', () => {
    it('should return session by ID', async () => {
      const mockSession = {
        id: 'session-1',
        user_id: 'user-1',
        project_id: null,
        created_at: new Date(),
      };
      query.mockResolvedValue({ rows: [mockSession] });

      const result = await agentService.getSession('session-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['session-1']
      );
      expect(result).toEqual(mockSession);
    });

    it('should return null for invalid session', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await agentService.getSession('invalid');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      query.mockRejectedValue(new Error('Database error'));

      const result = await agentService.getSession('session-1');

      expect(result).toBeNull();
    });
  });

  describe('updateSessionMessages', () => {
    it('should update session messages', async () => {
      query.mockResolvedValue({});
      const messages = [{ role: 'user', content: 'Hello' }];

      await agentService.updateSessionMessages('session-1', messages);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE agent_sessions'),
        ['session-1', JSON.stringify(messages)]
      );
    });

    it('should not throw on error', async () => {
      query.mockRejectedValue(new Error('Update failed'));

      // Should not throw
      await agentService.updateSessionMessages('session-1', []);
    });
  });

  // ============================================================================
  // Pending Actions
  // ============================================================================

  describe('createPendingAction', () => {
    it('should create pending action', async () => {
      query.mockResolvedValue({});
      const payload = { action: 'create_project', data: { name: 'New Project' } };

      const result = await agentService.createPendingAction(
        'session-1',
        'user-1',
        'create_project',
        payload,
        'Create project "New Project"'
      );

      expect(generateCuid).toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_pending_actions'),
        expect.arrayContaining([
          'test-cuid-123',
          'session-1',
          'user-1',
          'create_project',
        ])
      );
      expect(result.id).toBe('test-cuid-123');
      expect(result.status).toBe('pending');
    });

    it('should throw on database error', async () => {
      query.mockRejectedValue(new Error('Insert failed'));

      await expect(
        agentService.createPendingAction('s', 'u', 'type', {}, 'preview')
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('getPendingActions', () => {
    it('should return pending actions for user', async () => {
      const mockActions = [
        { id: 'action-1', status: 'pending', action_type: 'create' },
        { id: 'action-2', status: 'pending', action_type: 'update' },
      ];
      query.mockResolvedValue({ rows: mockActions });

      const result = await agentService.getPendingActions('user-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'"),
        ['user-1']
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty array on error', async () => {
      query.mockRejectedValue(new Error('Query failed'));

      const result = await agentService.getPendingActions('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('resolvePendingAction', () => {
    it('should update action status to approved', async () => {
      query.mockResolvedValue({});

      await agentService.resolvePendingAction('action-1', 'approved', 'user-1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE agent_pending_actions'),
        ['action-1', 'approved', 'user-1']
      );
    });

    it('should update action status to rejected', async () => {
      query.mockResolvedValue({});

      await agentService.resolvePendingAction('action-1', 'rejected', 'user-1');

      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['action-1', 'rejected', 'user-1']
      );
    });

    it('should throw on database error', async () => {
      query.mockRejectedValue(new Error('Update failed'));

      await expect(
        agentService.resolvePendingAction('action-1', 'approved', 'user-1')
      ).rejects.toThrow('Update failed');
    });
  });

  // ============================================================================
  // Audit Logging
  // ============================================================================

  describe('logAction', () => {
    it('should insert audit log entry', async () => {
      query.mockResolvedValue({});
      const input = { query: 'test' };
      const output = { results: [] };

      await agentService.logAction(
        'session-1',
        'user-1',
        'search',
        'search_projects',
        input,
        output,
        150
      );

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agent_audit_log'),
        expect.arrayContaining([
          'session-1',
          'user-1',
          'search',
          'search_projects',
          JSON.stringify(input),
          JSON.stringify(output),
          150,
        ])
      );
    });

    it('should not throw on error', async () => {
      query.mockRejectedValue(new Error('Insert failed'));

      // Should not throw
      await agentService.logAction('s', 'u', 'a', 's', {}, {}, 0);
    });
  });
});
