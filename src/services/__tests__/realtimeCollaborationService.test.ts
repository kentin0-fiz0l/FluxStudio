/**
 * Unit Tests for Realtime Collaboration Service (re-export module)
 * @file src/services/__tests__/realtimeCollaborationService.test.ts
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the collaboration module that this file re-exports from
const mockCollaborationService = {
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('../collaboration', () => ({
  realtimeCollaborationService: mockCollaborationService,
  collaborationService: mockCollaborationService,
  CollaborationService: vi.fn(),
}));

describe('realtimeCollaborationService (re-export)', () => {
  it('should re-export realtimeCollaborationService from collaboration module', async () => {
    const mod = await import('../realtimeCollaborationService');
    expect(mod.realtimeCollaborationService).toBe(mockCollaborationService);
  });

  it('should re-export collaborationService from collaboration module', async () => {
    const mod = await import('../realtimeCollaborationService');
    expect(mod.collaborationService).toBe(mockCollaborationService);
  });

  it('should re-export CollaborationService class', async () => {
    const mod = await import('../realtimeCollaborationService');
    expect(mod.CollaborationService).toBeDefined();
  });

  it('should have default export equal to realtimeCollaborationService', async () => {
    const mod = await import('../realtimeCollaborationService');
    expect(mod.default).toBe(mockCollaborationService);
  });
});
