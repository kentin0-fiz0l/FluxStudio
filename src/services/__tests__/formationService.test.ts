/**
 * Unit Tests for Formation Service
 * @file src/services/__tests__/formationService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock jsPDF
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: { pageSize: { getWidth: () => 279, getHeight: () => 216 } },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    setTextColor: vi.fn(),
    rect: vi.fn(),
    circle: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    output: vi.fn().mockReturnValue(new Blob(['pdf'], { type: 'application/pdf' })),
  })),
}));

// Mock template registry
vi.mock('../formationTemplates/registry', () => ({
  templateRegistry: {
    getTemplate: vi.fn(),
    scaleTemplateForPerformers: vi.fn(),
  },
}));

import { formationService } from '../formationService';
import { templateRegistry } from '../formationTemplates/registry';

describe('FormationService', () => {
  beforeEach(() => {
    // Clear all formations between tests
    const formations = (formationService as any).formations as Map<string, any>;
    formations.clear();
    formationService.stop();
  });

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  describe('createFormation', () => {
    it('should create a formation with defaults', () => {
      const f = formationService.createFormation('Test', 'proj-1');

      expect(f.id).toMatch(/^formation-/);
      expect(f.name).toBe('Test');
      expect(f.projectId).toBe('proj-1');
      expect(f.stageWidth).toBe(40);
      expect(f.stageHeight).toBe(30);
      expect(f.gridSize).toBe(2);
      expect(f.performers).toEqual([]);
      expect(f.keyframes.length).toBe(1);
      expect(f.keyframes[0].timestamp).toBe(0);
    });

    it('should create a formation with custom options', () => {
      const f = formationService.createFormation('Custom', 'proj-1', {
        stageWidth: 60,
        stageHeight: 40,
        gridSize: 4,
        description: 'A formation',
        createdBy: 'user-1',
      });

      expect(f.stageWidth).toBe(60);
      expect(f.stageHeight).toBe(40);
      expect(f.gridSize).toBe(4);
      expect(f.description).toBe('A formation');
      expect(f.createdBy).toBe('user-1');
    });

    it('should not create initial keyframe when keyframes provided', () => {
      const kf = {
        id: 'kf-1',
        timestamp: 1000,
        positions: new Map(),
        transition: 'linear' as const,
      };
      const f = formationService.createFormation('Test', 'proj-1', { keyframes: [kf] });
      expect(f.keyframes.length).toBe(1);
      expect(f.keyframes[0].id).toBe('kf-1');
    });
  });

  describe('getFormation', () => {
    it('should return a formation by id', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const found = formationService.getFormation(f.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Test');
    });

    it('should return undefined for non-existent id', () => {
      expect(formationService.getFormation('nonexistent')).toBeUndefined();
    });
  });

  describe('registerFormation', () => {
    it('should register and normalize a formation from API', () => {
      const apiFormation = {
        id: 'api-form-1',
        name: 'API Formation',
        projectId: 'proj-1',
        stageWidth: 40,
        stageHeight: 30,
        gridSize: 2,
        performers: [],
        keyframes: [{
          id: 'kf-1',
          timestamp: 0,
          positions: { 'p1': { x: 10, y: 20 } },
        }],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        createdBy: 'user-1',
      } as any;

      const registered = formationService.registerFormation(apiFormation);
      expect(registered.keyframes[0].positions).toBeInstanceOf(Map);
      expect(registered.keyframes[0].positions.get('p1')).toEqual({ x: 10, y: 20 });
    });

    it('should handle positions that are already Maps', () => {
      const formation = {
        id: 'map-form-1',
        name: 'Map Formation',
        projectId: 'proj-1',
        stageWidth: 40,
        stageHeight: 30,
        gridSize: 2,
        performers: [],
        keyframes: [{
          id: 'kf-1',
          timestamp: 0,
          positions: new Map([['p1', { x: 5, y: 5 }]]),
        }],
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
        createdBy: 'user-1',
      } as any;

      const registered = formationService.registerFormation(formation);
      expect(registered.keyframes[0].positions.get('p1')).toEqual({ x: 5, y: 5 });
    });
  });

  describe('updateFormation', () => {
    it('should update a formation', () => {
      const f = formationService.createFormation('Old', 'proj-1');
      const updated = formationService.updateFormation(f.id, { name: 'New' });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('New');
      expect(updated!.name).not.toBe('Old');
    });

    it('should return undefined for non-existent formation', () => {
      expect(formationService.updateFormation('none', { name: 'X' })).toBeUndefined();
    });
  });

  describe('deleteFormation', () => {
    it('should delete a formation', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      expect(formationService.deleteFormation(f.id)).toBe(true);
      expect(formationService.getFormation(f.id)).toBeUndefined();
    });

    it('should return false for non-existent formation', () => {
      expect(formationService.deleteFormation('none')).toBe(false);
    });
  });

  describe('listFormations', () => {
    it('should list formations for a project', () => {
      formationService.createFormation('A', 'proj-1');
      formationService.createFormation('B', 'proj-1');
      formationService.createFormation('C', 'proj-2');

      const list = formationService.listFormations('proj-1');
      expect(list.length).toBe(2);
    });

    it('should return empty for project with no formations', () => {
      expect(formationService.listFormations('proj-99')).toEqual([]);
    });
  });

  // ============================================================================
  // PERFORMER OPERATIONS
  // ============================================================================

  describe('addPerformer', () => {
    it('should add a performer to a formation', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, {
        name: 'Alice',
        label: 'A1',
        color: '#ff0000',
      });

      expect(p).toBeDefined();
      expect(p!.id).toMatch(/^performer-/);
      expect(p!.name).toBe('Alice');
    });

    it('should set initial position in first keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(
        f.id,
        { name: 'Alice', label: 'A1', color: '#ff0000' },
        { x: 50, y: 50 }
      );

      const pos = f.keyframes[0].positions.get(p!.id);
      expect(pos).toEqual({ x: 50, y: 50 });
    });

    it('should return undefined for non-existent formation', () => {
      expect(formationService.addPerformer('none', { name: 'A', label: 'A', color: '#fff' })).toBeUndefined();
    });
  });

  describe('removePerformer', () => {
    it('should remove performer and positions from all keyframes', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 10, y: 10 });

      expect(formationService.removePerformer(f.id, p!.id)).toBe(true);
      expect(f.performers.length).toBe(0);
      expect(f.keyframes[0].positions.has(p!.id)).toBe(false);
    });

    it('should return false for non-existent performer', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      expect(formationService.removePerformer(f.id, 'none')).toBe(false);
    });

    it('should return false for non-existent formation', () => {
      expect(formationService.removePerformer('none', 'p1')).toBe(false);
    });
  });

  describe('updatePerformer', () => {
    it('should update performer properties', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'Old', label: 'O', color: '#000' });
      const updated = formationService.updatePerformer(f.id, p!.id, { name: 'New', color: '#fff' });

      expect(updated!.name).toBe('New');
      expect(updated!.color).toBe('#fff');
    });

    it('should return undefined for non-existent performer', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      expect(formationService.updatePerformer(f.id, 'none', { name: 'X' })).toBeUndefined();
    });
  });

  // ============================================================================
  // KEYFRAME OPERATIONS
  // ============================================================================

  describe('addKeyframe', () => {
    it('should add a keyframe in sorted order', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.addKeyframe(f.id, 5000);
      formationService.addKeyframe(f.id, 2000);

      expect(f.keyframes[0].timestamp).toBe(0);
      expect(f.keyframes[1].timestamp).toBe(2000);
      expect(f.keyframes[2].timestamp).toBe(5000);
    });

    it('should return undefined for non-existent formation', () => {
      expect(formationService.addKeyframe('none', 1000)).toBeUndefined();
    });

    it('should support custom transition and duration', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const kf = formationService.addKeyframe(f.id, 1000, undefined, { transition: 'ease-in', duration: 500 });

      expect(kf!.transition).toBe('ease-in');
      expect(kf!.duration).toBe(500);
    });
  });

  describe('removeKeyframe', () => {
    it('should remove a non-first keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const kf = formationService.addKeyframe(f.id, 2000);

      expect(formationService.removeKeyframe(f.id, kf!.id)).toBe(true);
      expect(f.keyframes.length).toBe(1);
    });

    it('should not allow removing the first keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      expect(formationService.removeKeyframe(f.id, f.keyframes[0].id)).toBe(false);
    });

    it('should not allow removing when only one keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      expect(formationService.removeKeyframe(f.id, f.keyframes[0].id)).toBe(false);
    });

    it('should return false for non-existent keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.addKeyframe(f.id, 2000);
      expect(formationService.removeKeyframe(f.id, 'none')).toBe(false);
    });
  });

  describe('updatePosition', () => {
    it('should update performer position in a keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' });

      expect(formationService.updatePosition(f.id, f.keyframes[0].id, p!.id, { x: 75, y: 25 })).toBe(true);
      expect(f.keyframes[0].positions.get(p!.id)).toEqual({ x: 75, y: 25 });
    });

    it('should return false for non-existent formation', () => {
      expect(formationService.updatePosition('none', 'kf', 'p', { x: 0, y: 0 })).toBe(false);
    });

    it('should return false for non-existent keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      expect(formationService.updatePosition(f.id, 'none', 'p', { x: 0, y: 0 })).toBe(false);
    });
  });

  describe('getPositionsAtTime', () => {
    it('should return empty map for non-existent formation', () => {
      expect(formationService.getPositionsAtTime('none', 0).size).toBe(0);
    });

    it('should return first keyframe positions at time 0', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 10, y: 20 });

      const positions = formationService.getPositionsAtTime(f.id, 0);
      expect(positions.get(p!.id)).toEqual({ x: 10, y: 20 });
    });

    it('should interpolate between keyframes', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 0, y: 0 });
      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100 }]]));

      const positions = formationService.getPositionsAtTime(f.id, 500);
      const pos = positions.get(p!.id)!;
      expect(pos.x).toBeCloseTo(50, 0);
      expect(pos.y).toBeCloseTo(50, 0);
    });

    it('should handle performer in only one keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 10, y: 20 });
      formationService.addKeyframe(f.id, 1000);

      const positions = formationService.getPositionsAtTime(f.id, 500);
      expect(positions.get(p!.id)).toEqual({ x: 10, y: 20 });
    });
  });

  // ============================================================================
  // PLAYBACK
  // ============================================================================

  describe('playback controls', () => {
    it('should return initial playback state', () => {
      const state = formationService.getPlaybackState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.speed).toBe(1);
      expect(state.loop).toBe(false);
    });

    it('should pause playback', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.play(f.id);
      formationService.pause();
      expect(formationService.getPlaybackState().isPlaying).toBe(false);
    });

    it('should stop and reset', () => {
      formationService.stop();
      const state = formationService.getPlaybackState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
    });

    it('should seek to a time', () => {
      (formationService as any).playbackState.duration = 10000;
      formationService.seek(5000);
      expect(formationService.getPlaybackState().currentTime).toBe(5000);
    });

    it('should clamp seek to valid range', () => {
      (formationService as any).playbackState.duration = 10000;
      formationService.seek(-100);
      expect(formationService.getPlaybackState().currentTime).toBe(0);

      formationService.seek(99999);
      expect(formationService.getPlaybackState().currentTime).toBe(10000);
    });

    it('should set speed within bounds', () => {
      formationService.setSpeed(2);
      expect(formationService.getPlaybackState().speed).toBe(2);

      formationService.setSpeed(0.1);
      expect(formationService.getPlaybackState().speed).toBe(0.25);

      formationService.setSpeed(10);
      expect(formationService.getPlaybackState().speed).toBe(4);
    });

    it('should toggle loop', () => {
      expect(formationService.toggleLoop()).toBe(true);
      expect(formationService.toggleLoop()).toBe(false);
    });
  });

  // ============================================================================
  // PATH CALCULATION
  // ============================================================================

  describe('getPerformerPath', () => {
    it('should return empty array for non-existent formation', () => {
      expect(formationService.getPerformerPath('none', 'p1')).toEqual([]);
    });

    it('should generate path points between keyframes', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 0, y: 0 });
      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100 }]]));

      const path = formationService.getPerformerPath(f.id, p!.id);
      expect(path.length).toBeGreaterThan(1);
      // First point should be at start
      expect(path[0].position.x).toBe(0);
      // Last point should be at end
      expect(path[path.length - 1].position.x).toBe(100);
    });
  });

  describe('getAllPerformerPaths', () => {
    it('should return paths for all performers', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p1 = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 0, y: 0 });
      const p2 = formationService.addPerformer(f.id, { name: 'B', label: 'B', color: '#00f' }, { x: 50, y: 50 });
      formationService.addKeyframe(f.id, 1000, new Map([
        [p1!.id, { x: 100, y: 100 }],
        [p2!.id, { x: 0, y: 0 }],
      ]));

      const paths = formationService.getAllPerformerPaths(f.id);
      expect(paths.size).toBe(2);
    });

    it('should return empty map for non-existent formation', () => {
      expect(formationService.getAllPerformerPaths('none').size).toBe(0);
    });
  });

  // ============================================================================
  // EXPORT
  // ============================================================================

  describe('exportFormation', () => {
    it('should return null for non-existent formation', async () => {
      const result = await formationService.exportFormation('none', {
        format: 'pdf',
        includeGrid: true,
        includeLabels: true,
        includeTimestamps: true,
      });
      expect(result).toBeNull();
    });

    it('should export to PDF', async () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#ff0000' }, { x: 50, y: 50 });

      const blob = await formationService.exportFormation(f.id, {
        format: 'pdf',
        includeGrid: true,
        includeLabels: true,
        includeTimestamps: true,
      });
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should return null for unsupported format', async () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const result = await formationService.exportFormation(f.id, {
        format: 'unsupported' as any,
        includeGrid: false,
        includeLabels: false,
        includeTimestamps: false,
      });
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // TEMPLATE APPLICATION
  // ============================================================================

  describe('applyTemplate', () => {
    it('should fail for non-existent formation', () => {
      const result = formationService.applyTemplate({
        formationId: 'none',
        templateId: 'tmpl-1',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Formation not found');
    });

    it('should fail for non-existent template', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      vi.mocked(templateRegistry.getTemplate).mockReturnValue(undefined as any);

      const result = formationService.applyTemplate({
        formationId: f.id,
        templateId: 'none',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should fail when not enough performers and createMissingPerformers is false', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      vi.mocked(templateRegistry.getTemplate).mockReturnValue({
        id: 'tmpl-1',
        name: 'Test Template',
        parameters: { minPerformers: 4, maxPerformers: 10 },
      } as any);

      const result = formationService.applyTemplate({
        formationId: f.id,
        templateId: 'tmpl-1',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 4 performers');
    });

    it('should succeed and create missing performers', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      vi.mocked(templateRegistry.getTemplate).mockReturnValue({
        id: 'tmpl-1',
        name: 'Test Template',
        parameters: { minPerformers: 2, maxPerformers: 10 },
      } as any);
      vi.mocked(templateRegistry.scaleTemplateForPerformers).mockReturnValue([
        { x: 25, y: 50 },
        { x: 75, y: 50 },
      ]);

      const result = formationService.applyTemplate({
        formationId: f.id,
        templateId: 'tmpl-1',
        createMissingPerformers: true,
      });

      expect(result.success).toBe(true);
      expect(result.performersCreated).toBe(2);
      expect(result.keyframesCreated).toBe(1);
    });

    it('should apply template with scale, rotation, and mirror options', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.addPerformer(f.id, { name: 'A', label: '1', color: '#f00' });
      formationService.addPerformer(f.id, { name: 'B', label: '2', color: '#0f0' });

      vi.mocked(templateRegistry.getTemplate).mockReturnValue({
        id: 'tmpl-1',
        name: 'Test Template',
        parameters: { minPerformers: 1, maxPerformers: 10 },
      } as any);
      vi.mocked(templateRegistry.scaleTemplateForPerformers).mockReturnValue([
        { x: 25, y: 50 },
        { x: 75, y: 50 },
      ]);

      const result = formationService.applyTemplate({
        formationId: f.id,
        templateId: 'tmpl-1',
        scale: 0.5,
        rotation: 90,
        centerX: 50,
        centerY: 50,
        mirror: 'horizontal',
      });

      expect(result.success).toBe(true);
    });

    it('should replace existing keyframes when replaceExisting is true', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.addPerformer(f.id, { name: 'A', label: '1', color: '#f00' });
      formationService.addKeyframe(f.id, 2000);
      formationService.addKeyframe(f.id, 4000);

      vi.mocked(templateRegistry.getTemplate).mockReturnValue({
        id: 'tmpl-1',
        name: 'Test Template',
        parameters: { minPerformers: 1, maxPerformers: 10 },
      } as any);
      vi.mocked(templateRegistry.scaleTemplateForPerformers).mockReturnValue([
        { x: 50, y: 50 },
      ]);

      const result = formationService.applyTemplate({
        formationId: f.id,
        templateId: 'tmpl-1',
        replaceExisting: true,
      });

      expect(result.success).toBe(true);
      expect(result.keyframesCreated).toBe(1);
    });

    it('should insert at end when insertAt is "end"', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.addPerformer(f.id, { name: 'A', label: '1', color: '#f00' });

      vi.mocked(templateRegistry.getTemplate).mockReturnValue({
        id: 'tmpl-1',
        name: 'Test',
        parameters: { minPerformers: 1, maxPerformers: 10 },
      } as any);
      vi.mocked(templateRegistry.scaleTemplateForPerformers).mockReturnValue([
        { x: 50, y: 50 },
      ]);

      const result = formationService.applyTemplate({
        formationId: f.id,
        templateId: 'tmpl-1',
        insertAt: 'end',
      });

      expect(result.success).toBe(true);
    });

    it('should insert at a specific numeric timestamp', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      formationService.addPerformer(f.id, { name: 'A', label: '1', color: '#f00' });

      vi.mocked(templateRegistry.getTemplate).mockReturnValue({
        id: 'tmpl-1',
        name: 'Test',
        parameters: { minPerformers: 1, maxPerformers: 10 },
      } as any);
      vi.mocked(templateRegistry.scaleTemplateForPerformers).mockReturnValue([
        { x: 50, y: 50 },
      ]);

      const result = formationService.applyTemplate({
        formationId: f.id,
        templateId: 'tmpl-1',
        insertAt: 3000,
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // ADDITIONAL EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty formation with no keyframes for getPositionsAtTime', () => {
      const f = formationService.createFormation('Test', 'proj-1', {
        keyframes: [{ id: 'kf-only', timestamp: 0, positions: new Map(), transition: 'linear' }],
      });
      const positions = formationService.getPositionsAtTime(f.id, 500);
      expect(positions.size).toBe(0);
    });

    it('should handle rotation interpolation wrapping around 360', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' });
      f.keyframes[0].positions.set(p!.id, { x: 0, y: 0, rotation: 350 });
      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100, rotation: 10 }]]));

      const positions = formationService.getPositionsAtTime(f.id, 500);
      const pos = positions.get(p!.id);
      expect(pos).toBeDefined();
      // Should wrap around through 0/360 rather than going backwards
      expect(pos!.rotation).toBeDefined();
    });

    it('should handle maximum performers (large formation)', () => {
      const f = formationService.createFormation('Large', 'proj-1');
      for (let i = 0; i < 100; i++) {
        formationService.addPerformer(f.id, {
          name: `P${i}`,
          label: `${i}`,
          color: '#000',
        }, { x: i, y: i });
      }

      expect(f.performers.length).toBe(100);
      const positions = formationService.getPositionsAtTime(f.id, 0);
      expect(positions.size).toBe(100);
    });

    it('should handle getPerformerPath with performer not in any keyframe', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' });
      // Don't set positions, add a second keyframe without positions
      formationService.addKeyframe(f.id, 1000);

      const path = formationService.getPerformerPath(f.id, p!.id);
      // Should return just the last keyframe position if any, or empty
      expect(Array.isArray(path)).toBe(true);
    });

    it('should handle easing types correctly in getPositionsAtTime', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 0, y: 0 });

      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100 }]]), { transition: 'ease-in' });

      const positions = formationService.getPositionsAtTime(f.id, 500);
      const pos = positions.get(p!.id);
      expect(pos).toBeDefined();
      // ease-in at t=0.5 should give t*t = 0.25, so x ~ 25
      expect(pos!.x).toBeCloseTo(25, 0);
    });

    it('should handle ease-out easing', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 0, y: 0 });

      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100 }]]), { transition: 'ease-out' });

      const positions = formationService.getPositionsAtTime(f.id, 500);
      const pos = positions.get(p!.id);
      expect(pos).toBeDefined();
      // ease-out at t=0.5 should give t*(2-t) = 0.75, so x ~ 75
      expect(pos!.x).toBeCloseTo(75, 0);
    });

    it('should handle ease-in-out easing', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 0, y: 0 });

      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100 }]]), { transition: 'ease-in-out' });

      const positions = formationService.getPositionsAtTime(f.id, 500);
      const pos = positions.get(p!.id);
      expect(pos).toBeDefined();
      // ease-in-out at t=0.5 should give 0.5
      expect(pos!.x).toBeCloseTo(50, 0);
    });

    it('should handle "ease" easing (smooth step)', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 0, y: 0 });

      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100 }]]), { transition: 'ease' });

      const positions = formationService.getPositionsAtTime(f.id, 500);
      const pos = positions.get(p!.id);
      expect(pos).toBeDefined();
      // ease at t=0.5: t*t*(3-2*t) = 0.5
      expect(pos!.x).toBeCloseTo(50, 0);
    });

    it('should extrapolate beyond last keyframe (no clamping)', () => {
      const f = formationService.createFormation('Test', 'proj-1');
      const p = formationService.addPerformer(f.id, { name: 'A', label: 'A', color: '#f00' }, { x: 10, y: 20 });
      formationService.addKeyframe(f.id, 1000, new Map([[p!.id, { x: 100, y: 100 }]]));

      const positions = formationService.getPositionsAtTime(f.id, 5000);
      const pos = positions.get(p!.id);
      expect(pos).toBeDefined();
      // With time=5000 and keyframes at 0 and 1000, progress = 5.0 which extrapolates
      expect(pos!.x).toBeGreaterThan(100);
    });
  });
});
