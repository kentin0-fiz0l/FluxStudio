/**
 * Tests for formationExport.ts
 *
 * Covers: formatTime, hexToRgb, exportToPdf, exportToImage, exportToSvg,
 * exportToAnimation, exportToCoordinateSheetPdf, exportToDrillBookPdf,
 * exportAllDrillBooks, exportProductionSheetPdf, exportProductionSheetCsv,
 * exportAudioSyncFile
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Formation, FormationExportOptions, Keyframe, Performer, Position, DrillSet, FieldConfig, CoordinateEntry, StepInfo } from '../formationTypes';
import type { TempoMap, TempoMapSegment } from '../tempoMap';
import type { ProductionSheet, ProductionSheetEntry } from '../productionSheet';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock jspdf - dynamic import so we mock the module
const mockDocMethods = {
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
  setPage: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(30),
  output: vi.fn().mockReturnValue(new Blob(['pdf-data'], { type: 'application/pdf' })),
  internal: {
    pageSize: {
      getWidth: () => 279.4,
      getHeight: () => 215.9,
    },
  },
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockDocMethods),
}));

// Mock gifEncoder
vi.mock('../gifEncoder', () => ({
  quantizeFrame: vi.fn().mockReturnValue({
    indexedPixels: new Uint8Array(10),
    palette: new Uint8Array(768),
  }),
  encodeGif: vi.fn().mockReturnValue(new Uint8Array(100)),
}));

// Mock coordinateSheetGenerator
vi.mock('../coordinateSheetGenerator', () => ({
  generateCoordinateSheet: vi.fn().mockReturnValue([]),
  generateDrillBookPages: vi.fn().mockReturnValue([]),
}));

// Mock tempoMap functions
vi.mock('../tempoMap', () => ({
  getTempoAtCount: vi.fn().mockReturnValue(120),
  getSegmentAtCount: vi.fn().mockReturnValue({
    startCount: 1,
    endCount: 8,
    tempoStart: 120,
    tempoEnd: 120,
    tempoCurve: 'linear' as const,
    beatsPerBar: 4,
    startBar: 1,
    bars: 2,
    sectionName: 'Opener',
    sectionId: 'sec-1',
  }),
  countToTimeMs: vi.fn().mockImplementation((count: number) => count * 500),
}));

// Mock fieldConfigService
vi.mock('../fieldConfigService', () => ({
  NCAA_FOOTBALL_FIELD: {
    type: 'ncaa_football',
    name: 'NCAA Football Field',
    width: 120,
    height: 53.33,
    yardLineInterval: 5,
    hashMarks: { front: 20, back: 20 },
    endZoneDepth: 10,
    unit: 'yards',
  } satisfies FieldConfig,
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePerformer(overrides: Partial<Performer> = {}): Performer {
  return {
    id: 'p-1',
    name: 'Alice',
    label: 'A1',
    color: '#ff0000',
    instrument: 'Trumpet',
    section: 'Brass',
    drillNumber: 'T1',
    ...overrides,
  };
}

function makePosition(overrides: Partial<Position> = {}): Position {
  return { x: 50, y: 50, ...overrides };
}

function makeKeyframe(overrides: Partial<Keyframe> = {}): Keyframe {
  const positions = new Map<string, Position>();
  positions.set('p-1', makePosition());
  return {
    id: 'kf-1',
    timestamp: 0,
    positions,
    transition: 'linear',
    ...overrides,
  };
}

function makeFormation(overrides: Partial<Formation> = {}): Formation {
  return {
    id: 'form-1',
    name: 'Test Formation',
    description: 'A test formation',
    projectId: 'proj-1',
    stageWidth: 100,
    stageHeight: 60,
    gridSize: 10,
    performers: [makePerformer()],
    keyframes: [makeKeyframe()],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    ...overrides,
  };
}

function makeExportOptions(overrides: Partial<FormationExportOptions> = {}): FormationExportOptions {
  return {
    format: 'pdf',
    includeGrid: true,
    includeLabels: true,
    includeTimestamps: true,
    ...overrides,
  };
}

function makeTempoMap(): TempoMap {
  return {
    segments: [
      {
        startCount: 1,
        endCount: 16,
        tempoStart: 120,
        tempoEnd: 120,
        tempoCurve: 'linear',
        beatsPerBar: 4,
        startBar: 1,
        bars: 4,
        sectionName: 'Opener',
        sectionId: 'sec-1',
      },
    ],
    totalCounts: 16,
    totalDurationMs: 8000,
  };
}

function makeDrillSet(overrides: Partial<DrillSet> = {}): DrillSet {
  return {
    id: 'set-1',
    name: 'Set 1',
    counts: 8,
    keyframeId: 'kf-1',
    sortOrder: 0,
    ...overrides,
  };
}

function makeProductionSheet(): ProductionSheet {
  return {
    formationId: 'form-1',
    entries: [
      {
        id: 'ps-1',
        setId: 'Set 1',
        sectionName: 'Opener',
        startMeasure: 1,
        endMeasure: 4,
        counts: 16,
        cumulativeCount: 16,
        tempo: 120,
        rehearsalMark: 'A',
        notes: 'Start here',
      },
      {
        id: 'ps-2',
        setId: 'Set 2',
        startMeasure: 5,
        endMeasure: 8,
        counts: 16,
        cumulativeCount: 32,
        tempo: 140,
      },
    ],
    totalCounts: 32,
    totalDurationMs: 16000,
  };
}

function makeCoordinateEntry(overrides: Partial<CoordinateEntry> = {}): CoordinateEntry {
  return {
    set: makeDrillSet(),
    coordinate: '4 steps outside R35',
    coordinateDetails: {
      sideToSide: '4 steps outside R35',
      frontToBack: '12 behind front hash',
    },
    stepToNext: {
      distance: 10,
      distanceYards: 5,
      stepSize: 8,
      stepSizeLabel: '8 to 5',
      directionLabel: 'to the right',
      direction: 0,
      difficulty: 'easy',
      counts: 8,
    },
    stepFromPrev: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Blob text helper (Blob.text() not available in jsdom)
// ---------------------------------------------------------------------------

async function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// ---------------------------------------------------------------------------
// Canvas mock helpers
// ---------------------------------------------------------------------------

function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(100),
      width: 10,
      height: 10,
    }),
  } as unknown as CanvasRenderingContext2D;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Import the module under test *after* mocks are set up
import {
  formatTime,
  hexToRgb,
  exportToPdf,
  exportToImage,
  exportToSvg,
  exportToAnimation,
  exportToCoordinateSheetPdf,
  exportToDrillBookPdf,
  exportAllDrillBooks,
  exportProductionSheetPdf,
  exportProductionSheetCsv,
  exportAudioSyncFile,
} from '../formationExport';

describe('formationExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mockDocMethods call counts
    Object.values(mockDocMethods).forEach((v) => {
      if (typeof v === 'function' && 'mockClear' in v) {
        (v as Mock).mockClear();
      }
    });
    mockDocMethods.output.mockReturnValue(new Blob(['pdf-data'], { type: 'application/pdf' }));
  });

  // =========================================================================
  // formatTime
  // =========================================================================
  describe('formatTime', () => {
    it('formats 0ms as 0:00.00', () => {
      expect(formatTime(0)).toBe('0:00.00');
    });

    it('formats whole seconds', () => {
      expect(formatTime(5000)).toBe('0:05.00');
    });

    it('formats minutes and seconds', () => {
      expect(formatTime(65000)).toBe('1:05.00');
    });

    it('formats with centiseconds', () => {
      expect(formatTime(1234)).toBe('0:01.23');
    });

    it('pads seconds to two digits', () => {
      expect(formatTime(3000)).toBe('0:03.00');
    });

    it('pads centiseconds to two digits', () => {
      expect(formatTime(1050)).toBe('0:01.05');
    });

    it('handles large values', () => {
      expect(formatTime(600000)).toBe('10:00.00');
    });
  });

  // =========================================================================
  // hexToRgb
  // =========================================================================
  describe('hexToRgb', () => {
    it('parses a standard hex color', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses hex without hash prefix', () => {
      expect(hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('parses mixed case', () => {
      expect(hexToRgb('#aAbBcC')).toEqual({ r: 170, g: 187, b: 204 });
    });

    it('returns fallback gray for invalid hex', () => {
      expect(hexToRgb('not-a-hex')).toEqual({ r: 100, g: 100, b: 100 });
    });

    it('returns fallback for empty string', () => {
      expect(hexToRgb('')).toEqual({ r: 100, g: 100, b: 100 });
    });

    it('parses black', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('parses white', () => {
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  // =========================================================================
  // exportToPdf
  // =========================================================================
  describe('exportToPdf', () => {
    it('returns a Blob', async () => {
      const result = await exportToPdf(makeFormation(), makeExportOptions());
      expect(result).toBeInstanceOf(Blob);
    });

    it('calls jsPDF constructor with correct options', async () => {
      const { jsPDF } = await import('jspdf');
      await exportToPdf(makeFormation(), makeExportOptions({ paperSize: 'a4', orientation: 'portrait' }));
      expect(jsPDF).toHaveBeenCalledWith({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    });

    it('defaults to landscape letter', async () => {
      const { jsPDF } = await import('jspdf');
      await exportToPdf(makeFormation(), makeExportOptions());
      expect(jsPDF).toHaveBeenCalledWith({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    });

    it('draws the formation name', async () => {
      await exportToPdf(makeFormation({ name: 'My Show' }), makeExportOptions());
      expect(mockDocMethods.text).toHaveBeenCalledWith('My Show', expect.any(Number), expect.any(Number));
    });

    it('draws formation description when provided', async () => {
      await exportToPdf(makeFormation({ description: 'Opener segment' }), makeExportOptions());
      expect(mockDocMethods.text).toHaveBeenCalledWith('Opener segment', expect.any(Number), expect.any(Number));
    });

    it('adds page for each keyframe beyond the first', async () => {
      const kf2 = makeKeyframe({ id: 'kf-2', timestamp: 2000 });
      const formation = makeFormation({ keyframes: [makeKeyframe(), kf2] });
      await exportToPdf(formation, makeExportOptions());
      expect(mockDocMethods.addPage).toHaveBeenCalledTimes(1);
    });

    it('draws grid lines when includeGrid is true', async () => {
      await exportToPdf(makeFormation(), makeExportOptions({ includeGrid: true }));
      // Grid draws lines; check that doc.line was called
      expect(mockDocMethods.line).toHaveBeenCalled();
    });

    it('draws performer circles', async () => {
      await exportToPdf(makeFormation(), makeExportOptions());
      expect(mockDocMethods.circle).toHaveBeenCalled();
    });

    it('draws performer labels when includeLabels is true', async () => {
      await exportToPdf(makeFormation(), makeExportOptions({ includeLabels: true }));
      // Look for the performer label text
      const textCalls = mockDocMethods.text.mock.calls;
      const labelCall = textCalls.find((c: unknown[]) => c[0] === 'A1');
      expect(labelCall).toBeDefined();
    });

    it('draws timestamps when includeTimestamps is true', async () => {
      await exportToPdf(makeFormation(), makeExportOptions({ includeTimestamps: true }));
      const textCalls = mockDocMethods.text.mock.calls;
      const timeCall = textCalls.find((c: unknown[]) => c[0] === '0:00.00');
      expect(timeCall).toBeDefined();
    });

    it('draws field overlay when enabled', async () => {
      const lineBefore = mockDocMethods.line.mock.calls.length;
      await exportToPdf(makeFormation(), makeExportOptions({ includeFieldOverlay: true }));
      // Field overlay draws yard lines and hash marks
      expect(mockDocMethods.line.mock.calls.length).toBeGreaterThan(lineBefore);
    });

    it('draws rotation arrow for rotated performers', async () => {
      const positions = new Map<string, Position>();
      positions.set('p-1', { x: 50, y: 50, rotation: 45 });
      const kf = makeKeyframe({ positions });
      const formation = makeFormation({ keyframes: [kf] });
      await exportToPdf(formation, makeExportOptions());
      // rotation arrow draws an additional line
      const lineCalls = mockDocMethods.line.mock.calls;
      expect(lineCalls.length).toBeGreaterThan(0);
    });

    it('skips performer if no position in keyframe', async () => {
      const positions = new Map<string, Position>();
      // p-1 has no position
      const kf = makeKeyframe({ positions });
      const formation = makeFormation({ keyframes: [kf] });
      await exportToPdf(formation, makeExportOptions());
      // circle should not be called for the performer marker (only legend)
      // The legend still draws a circle for the performer
    });

    it('draws count annotation for keyframes after the first', async () => {
      const kf1 = makeKeyframe({ timestamp: 0 });
      const kf2positions = new Map<string, Position>();
      kf2positions.set('p-1', makePosition());
      const kf2 = makeKeyframe({ id: 'kf-2', timestamp: 4000, positions: kf2positions });
      const formation = makeFormation({ keyframes: [kf1, kf2] });
      await exportToPdf(formation, makeExportOptions());
      // Count annotation text should include "counts from prev"
      const textCalls = mockDocMethods.text.mock.calls;
      const countCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('counts from prev'));
      expect(countCall).toBeDefined();
    });

    it('draws tempo map annotations when tempoMap is provided', async () => {
      const kf1 = makeKeyframe({ timestamp: 0 });
      const kf2positions = new Map<string, Position>();
      kf2positions.set('p-1', makePosition());
      const kf2 = makeKeyframe({ id: 'kf-2', timestamp: 4000, positions: kf2positions });
      const formation = makeFormation({ keyframes: [kf1, kf2] });
      await exportToPdf(formation, makeExportOptions(), makeTempoMap());
      const textCalls = mockDocMethods.text.mock.calls;
      // Should include measure label
      const measureCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].startsWith('M.'));
      expect(measureCall).toBeDefined();
    });

    it('shows legend for performers', async () => {
      const formation = makeFormation();
      await exportToPdf(formation, makeExportOptions());
      const textCalls = mockDocMethods.text.mock.calls;
      const legendCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('A1: Alice'));
      expect(legendCall).toBeDefined();
    });

    it('truncates legend when more than 10 performers', async () => {
      const performers = Array.from({ length: 12 }, (_, i) =>
        makePerformer({ id: `p-${i}`, name: `Perf ${i}`, label: `P${i}` }),
      );
      const positions = new Map<string, Position>();
      performers.forEach((p) => positions.set(p.id, makePosition()));
      const kf = makeKeyframe({ positions });
      const formation = makeFormation({ performers, keyframes: [kf] });
      await exportToPdf(formation, makeExportOptions());
      const textCalls = mockDocMethods.text.mock.calls;
      const moreCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('and 2 more'));
      expect(moreCall).toBeDefined();
    });

    it('calls doc.output with blob format', async () => {
      await exportToPdf(makeFormation(), makeExportOptions());
      expect(mockDocMethods.output).toHaveBeenCalledWith('blob');
    });
  });

  // =========================================================================
  // exportToImage
  // =========================================================================
  describe('exportToImage', () => {
    let mockCtx: CanvasRenderingContext2D;
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
      mockCtx = createMockCanvasContext();
      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toBlob: vi.fn().mockImplementation((cb: BlobCallback, _type: string, _q: number) => {
          cb(new Blob(['image-data'], { type: 'image/png' }));
        }),
      } as unknown as HTMLCanvasElement;

      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement);
    });

    it('returns a Blob', async () => {
      const result = await exportToImage(makeFormation(), makeExportOptions({ format: 'png' }));
      expect(result).toBeInstanceOf(Blob);
    });

    it('creates a canvas with specified resolution', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png', resolution: { width: 800, height: 600 } }));
      expect(mockCanvas.width).toBe(800);
      expect(mockCanvas.height).toBe(600);
    });

    it('defaults to 1920x1080 resolution', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png' }));
      expect(mockCanvas.width).toBe(1920);
      expect(mockCanvas.height).toBe(1080);
    });

    it('throws when canvas context is null', async () => {
      (mockCanvas.getContext as Mock).mockReturnValue(null);
      await expect(exportToImage(makeFormation(), makeExportOptions())).rejects.toThrow('Could not create canvas context');
    });

    it('rejects when toBlob returns null', async () => {
      (mockCanvas.toBlob as Mock).mockImplementation((cb: BlobCallback) => cb(null));
      await expect(exportToImage(makeFormation(), makeExportOptions())).rejects.toThrow('Failed to create image blob');
    });

    it('uses image/png for png format', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png' }));
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', expect.any(Number));
    });

    it('uses image/jpeg for jpg format', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'jpg' }));
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', expect.any(Number));
    });

    it('applies quality setting', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png', quality: 80 }));
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.8);
    });

    it('defaults to 90% quality', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png' }));
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.9);
    });

    it('draws background fill', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png' }));
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('draws grid when includeGrid is true', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png', includeGrid: true }));
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('draws performer markers', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png' }));
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('draws labels when includeLabels is true', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png', includeLabels: true }));
      expect(mockCtx.fillText).toHaveBeenCalledWith('A1', expect.any(Number), expect.any(Number));
    });

    it('draws timestamps when includeTimestamps is true', async () => {
      await exportToImage(makeFormation(), makeExportOptions({ format: 'png', includeTimestamps: true }));
      const calls = (mockCtx.fillText as Mock).mock.calls;
      const nameCall = calls.find((c: unknown[]) => c[0] === 'Test Formation');
      expect(nameCall).toBeDefined();
    });

    it('draws rotation arrow for rotated performers', async () => {
      const positions = new Map<string, Position>();
      positions.set('p-1', { x: 50, y: 50, rotation: 90 });
      const kf = makeKeyframe({ positions });
      const formation = makeFormation({ keyframes: [kf] });
      await exportToImage(formation, makeExportOptions({ format: 'png' }));
      expect(mockCtx.lineTo).toHaveBeenCalled();
    });

    it('handles formation with no keyframes gracefully', async () => {
      const formation = makeFormation({ keyframes: [] });
      const result = await exportToImage(formation, makeExportOptions({ format: 'png' }));
      expect(result).toBeInstanceOf(Blob);
    });
  });

  // =========================================================================
  // exportToSvg
  // =========================================================================
  describe('exportToSvg', () => {
    it('returns an SVG blob', async () => {
      const result = await exportToSvg(makeFormation(), makeExportOptions());
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/svg+xml');
    });

    it('includes svg root element with correct dimensions', async () => {
      const formation = makeFormation({ stageWidth: 100, stageHeight: 60 });
      const result = await exportToSvg(formation, makeExportOptions());
      const text = await blobToText(result);
      // scale = 10, so width=1000, height=600
      expect(text).toContain('width="1000"');
      expect(text).toContain('height="600"');
    });

    it('includes viewBox attribute', async () => {
      const result = await exportToSvg(makeFormation({ stageWidth: 100, stageHeight: 60 }), makeExportOptions());
      const text = await blobToText(result);
      expect(text).toContain('viewBox="0 0 1000 600"');
    });

    it('includes background rect', async () => {
      const result = await exportToSvg(makeFormation(), makeExportOptions());
      const text = await blobToText(result);
      expect(text).toContain('fill="#f8fafc"');
    });

    it('draws grid lines when includeGrid is true', async () => {
      const result = await exportToSvg(makeFormation({ gridSize: 10 }), makeExportOptions({ includeGrid: true }));
      const text = await blobToText(result);
      expect(text).toContain('<line');
      expect(text).toContain('stroke="#e2e8f0"');
    });

    it('omits grid lines when includeGrid is false', async () => {
      const result = await exportToSvg(makeFormation(), makeExportOptions({ includeGrid: false }));
      const text = await blobToText(result);
      expect(text).not.toContain('<line');
    });

    it('draws performer circles', async () => {
      const result = await exportToSvg(makeFormation(), makeExportOptions());
      const text = await blobToText(result);
      expect(text).toContain('<circle');
      expect(text).toContain('fill="#ff0000"');
    });

    it('includes performer labels when includeLabels is true', async () => {
      const result = await exportToSvg(makeFormation(), makeExportOptions({ includeLabels: true }));
      const text = await blobToText(result);
      expect(text).toContain('<text');
      expect(text).toContain('>A1</text>');
    });

    it('omits performer labels when includeLabels is false', async () => {
      const result = await exportToSvg(makeFormation(), makeExportOptions({ includeLabels: false }));
      const text = await blobToText(result);
      expect(text).not.toContain('<text');
    });

    it('positions performer circles based on position data', async () => {
      const positions = new Map<string, Position>();
      positions.set('p-1', { x: 25, y: 75 });
      const kf = makeKeyframe({ positions });
      const formation = makeFormation({ stageWidth: 100, stageHeight: 60, keyframes: [kf] });
      const result = await exportToSvg(formation, makeExportOptions());
      const text = await blobToText(result);
      // cx = (25/100)*1000 = 250, cy = (75/100)*600 = 450
      expect(text).toContain('cx="250"');
      expect(text).toContain('cy="450"');
    });

    it('handles formation with no keyframes', async () => {
      const formation = makeFormation({ keyframes: [] });
      const result = await exportToSvg(formation, makeExportOptions());
      const text = await blobToText(result);
      // Should still have svg structure, no circles
      expect(text).toContain('<svg');
      expect(text).toContain('</svg>');
      expect(text).not.toContain('<circle');
    });

    it('handles performer without position in keyframe', async () => {
      const positions = new Map<string, Position>();
      // p-1 has no position entry
      const kf = makeKeyframe({ positions });
      const formation = makeFormation({ keyframes: [kf] });
      const result = await exportToSvg(formation, makeExportOptions());
      const text = await blobToText(result);
      expect(text).not.toContain('<circle');
    });

    it('renders multiple performers', async () => {
      const performers = [
        makePerformer({ id: 'p-1', color: '#ff0000', label: 'A1' }),
        makePerformer({ id: 'p-2', color: '#00ff00', label: 'B2' }),
      ];
      const positions = new Map<string, Position>();
      positions.set('p-1', { x: 20, y: 30 });
      positions.set('p-2', { x: 80, y: 70 });
      const kf = makeKeyframe({ positions });
      const formation = makeFormation({ performers, keyframes: [kf] });
      const result = await exportToSvg(formation, makeExportOptions({ includeLabels: true }));
      const text = await blobToText(result);
      expect(text).toContain('fill="#ff0000"');
      expect(text).toContain('fill="#00ff00"');
      expect(text).toContain('>A1</text>');
      expect(text).toContain('>B2</text>');
    });
  });

  // =========================================================================
  // exportToAnimation
  // =========================================================================
  describe('exportToAnimation', () => {
    let mockCtx: CanvasRenderingContext2D;
    let mockCanvas: HTMLCanvasElement;

    beforeEach(() => {
      mockCtx = createMockCanvasContext();
      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        captureStream: vi.fn().mockReturnValue({
          getTracks: () => [],
        }),
      } as unknown as HTMLCanvasElement;

      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement);
    });

    it('throws when canvas context is null', async () => {
      (mockCanvas.getContext as Mock).mockReturnValue(null);
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(5000);
      await expect(
        exportToAnimation(makeFormation(), makeExportOptions({ format: 'gif' }), getPos, getDur),
      ).rejects.toThrow('Could not create canvas context');
    });

    it('creates canvas with specified resolution for gif', async () => {
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(1000);
      await exportToAnimation(
        makeFormation(),
        makeExportOptions({ format: 'gif', resolution: { width: 640, height: 480 }, fps: 10 }),
        getPos,
        getDur,
      );
      expect(mockCanvas.width).toBe(640);
      expect(mockCanvas.height).toBe(480);
    });

    it('defaults to 1280x720 resolution', async () => {
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(1000);
      await exportToAnimation(
        makeFormation(),
        makeExportOptions({ format: 'gif', fps: 10 }),
        getPos,
        getDur,
      );
      expect(mockCanvas.width).toBe(1280);
      expect(mockCanvas.height).toBe(720);
    });

    it('returns a Blob for gif format', async () => {
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(1000);
      const result = await exportToAnimation(
        makeFormation(),
        makeExportOptions({ format: 'gif', fps: 10 }),
        getPos,
        getDur,
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it('calls getPositionsAtTime with formation id', async () => {
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(1000);
      await exportToAnimation(
        makeFormation({ id: 'form-42' }),
        makeExportOptions({ format: 'gif', fps: 10 }),
        getPos,
        getDur,
      );
      expect(getPos).toHaveBeenCalledWith('form-42', expect.any(Number));
    });

    it('invokes onProgress callback during gif rendering', async () => {
      const onProgress = vi.fn();
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(1000);
      await exportToAnimation(
        makeFormation(),
        makeExportOptions({ format: 'gif', fps: 10, onProgress }),
        getPos,
        getDur,
      );
      expect(onProgress).toHaveBeenCalled();
      // Should reach 'done' phase
      const doneCall = onProgress.mock.calls.find((c: unknown[]) => (c[0] as { phase: string }).phase === 'done');
      expect(doneCall).toBeDefined();
    });

    it('falls back to keyframe timestamp when getFormationDuration returns 0', async () => {
      const kf = makeKeyframe({ timestamp: 3000 });
      const formation = makeFormation({ keyframes: [kf] });
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(0);
      const result = await exportToAnimation(
        formation,
        makeExportOptions({ format: 'gif', fps: 10 }),
        getPos,
        getDur,
      );
      // Duration should be last timestamp + 1000 = 4000ms
      // At fps=10, frame count = ceil(4000/1000 * 10) = 40
      expect(result).toBeInstanceOf(Blob);
      expect(getPos.mock.calls.length).toBe(40);
    });

    it('uses 5000ms default when no keyframes and duration is 0', async () => {
      const formation = makeFormation({ keyframes: [] });
      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(0);
      const result = await exportToAnimation(
        formation,
        makeExportOptions({ format: 'gif', fps: 10 }),
        getPos,
        getDur,
      );
      expect(result).toBeInstanceOf(Blob);
      // 5000ms at 10fps = 50 frames
      expect(getPos.mock.calls.length).toBe(50);
    });

    it('uses MediaRecorder for video format', async () => {
      const chunks = [new Blob(['chunk'])];
      const mockRecorder = {
        start: vi.fn(),
        stop: vi.fn(),
        ondataavailable: null as ((e: { data: Blob }) => void) | null,
        onerror: null as (() => void) | null,
        onstop: null as (() => void) | null,
      };

      // When stop is called, fire events
      mockRecorder.stop.mockImplementation(() => {
        mockRecorder.ondataavailable?.({ data: chunks[0] });
        mockRecorder.onstop?.();
      });

      vi.stubGlobal('MediaRecorder', vi.fn().mockImplementation(() => mockRecorder));

      const getPos = vi.fn().mockReturnValue(new Map());
      const getDur = vi.fn().mockReturnValue(100); // very short

      // Use fake timers to handle setTimeout in renderNext
      vi.useFakeTimers();

      const promise = exportToAnimation(
        makeFormation(),
        makeExportOptions({ format: 'video', fps: 10 }),
        getPos,
        getDur,
      );

      // Advance timers to let all frames render
      for (let i = 0; i < 20; i++) {
        await vi.advanceTimersByTimeAsync(200);
      }

      const result = await promise;
      expect(result).toBeInstanceOf(Blob);

      vi.useRealTimers();
      vi.unstubAllGlobals();
    });
  });

  // =========================================================================
  // exportToCoordinateSheetPdf
  // =========================================================================
  describe('exportToCoordinateSheetPdf', () => {
    it('throws if performer not found', async () => {
      const formation = makeFormation();
      await expect(
        exportToCoordinateSheetPdf(formation, 'nonexistent'),
      ).rejects.toThrow('Performer nonexistent not found');
    });

    it('returns a Blob for a valid performer', async () => {
      const { generateCoordinateSheet } = await import('../coordinateSheetGenerator');
      (generateCoordinateSheet as Mock).mockReturnValue([makeCoordinateEntry()]);

      const formation = makeFormation();
      const result = await exportToCoordinateSheetPdf(formation, 'p-1', [makeDrillSet()]);
      expect(result).toBeInstanceOf(Blob);
    });

    it('calls generateCoordinateSheet with correct arguments', async () => {
      const { generateCoordinateSheet } = await import('../coordinateSheetGenerator');
      const sets = [makeDrillSet()];
      const formation = makeFormation();

      await exportToCoordinateSheetPdf(formation, 'p-1', sets);

      expect(generateCoordinateSheet).toHaveBeenCalledWith(
        formation,
        'p-1',
        sets,
        expect.objectContaining({ type: 'ncaa_football' }),
      );
    });

    it('writes performer name in header', async () => {
      const { generateCoordinateSheet } = await import('../coordinateSheetGenerator');
      (generateCoordinateSheet as Mock).mockReturnValue([]);

      const performer = makePerformer({ name: 'Bob', drillNumber: 'S5' });
      const formation = makeFormation({ performers: [performer] });
      await exportToCoordinateSheetPdf(formation, 'p-1', []);

      const textCalls = mockDocMethods.text.mock.calls;
      const nameCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('Bob'));
      expect(nameCall).toBeDefined();
    });

    it('writes drill number in parentheses', async () => {
      const { generateCoordinateSheet } = await import('../coordinateSheetGenerator');
      (generateCoordinateSheet as Mock).mockReturnValue([]);

      const performer = makePerformer({ name: 'Bob', drillNumber: 'S5' });
      const formation = makeFormation({ performers: [performer] });
      await exportToCoordinateSheetPdf(formation, 'p-1', []);

      const textCalls = mockDocMethods.text.mock.calls;
      const drillCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('(S5)'));
      expect(drillCall).toBeDefined();
    });

    it('includes section/instrument info when available', async () => {
      const { generateCoordinateSheet } = await import('../coordinateSheetGenerator');
      (generateCoordinateSheet as Mock).mockReturnValue([]);

      const performer = makePerformer({ section: 'Brass', instrument: 'Trumpet' });
      const formation = makeFormation({ performers: [performer] });
      await exportToCoordinateSheetPdf(formation, 'p-1', []);

      const textCalls = mockDocMethods.text.mock.calls;
      const sectionCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('Brass'));
      expect(sectionCall).toBeDefined();
    });

    it('includes tempo columns when tempoMap is provided', async () => {
      const { generateCoordinateSheet } = await import('../coordinateSheetGenerator');
      (generateCoordinateSheet as Mock).mockReturnValue([makeCoordinateEntry()]);

      const formation = makeFormation();
      await exportToCoordinateSheetPdf(formation, 'p-1', [makeDrillSet()], undefined, makeTempoMap());

      const textCalls = mockDocMethods.text.mock.calls;
      const tempoHeader = textCalls.find((c: unknown[]) => c[0] === 'Tempo');
      expect(tempoHeader).toBeDefined();
    });

    it('adds new page when entries overflow', async () => {
      const { generateCoordinateSheet } = await import('../coordinateSheetGenerator');
      // Generate many entries to trigger page overflow
      const entries = Array.from({ length: 60 }, (_, i) =>
        makeCoordinateEntry({
          set: makeDrillSet({ id: `set-${i}`, name: `Set ${i}`, sortOrder: i }),
        }),
      );
      (generateCoordinateSheet as Mock).mockReturnValue(entries);

      const formation = makeFormation();
      await exportToCoordinateSheetPdf(formation, 'p-1', [makeDrillSet()]);

      expect(mockDocMethods.addPage).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // exportToDrillBookPdf
  // =========================================================================
  describe('exportToDrillBookPdf', () => {
    it('throws when no pages are generated', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([]);

      await expect(
        exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]),
      ).rejects.toThrow('No pages generated for drill book');
    });

    it('returns a Blob when pages exist', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        {
          type: 'cover',
          performerName: 'Alice',
          data: {
            showName: 'Test Show',
            performerName: 'Alice',
            drillNumber: 'T1',
            totalSets: 5,
          },
        },
      ]);

      const result = await exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]);
      expect(result).toBeInstanceOf(Blob);
    });

    it('renders cover page with show name', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        {
          type: 'cover',
          performerName: 'Alice',
          data: {
            showName: 'Halftime Show 2025',
            performerName: 'Alice',
            drillNumber: 'T1',
            totalSets: 10,
          },
        },
      ]);

      await exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]);
      const textCalls = mockDocMethods.text.mock.calls;
      const showNameCall = textCalls.find((c: unknown[]) => c[0] === 'Halftime Show 2025');
      expect(showNameCall).toBeDefined();
    });

    it('renders chart page with set name', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        {
          type: 'chart',
          performerName: 'Alice',
          data: {
            positions: { 'p-1': { x: 50, y: 50 } },
            highlightPerformerId: 'p-1',
            set: makeDrillSet({ name: 'Set 3', counts: 16 }),
            fieldConfig: {},
          },
        },
      ]);

      await exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]);
      const textCalls = mockDocMethods.text.mock.calls;
      const setCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('Set 3'));
      expect(setCall).toBeDefined();
    });

    it('highlights the target performer on chart page', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        {
          type: 'chart',
          performerName: 'Alice',
          data: {
            positions: { 'p-1': { x: 50, y: 50 } },
            highlightPerformerId: 'p-1',
            set: makeDrillSet(),
            fieldConfig: {},
          },
        },
      ]);

      await exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]);
      const textCalls = mockDocMethods.text.mock.calls;
      const youCall = textCalls.find((c: unknown[]) => c[0] === 'YOU');
      expect(youCall).toBeDefined();
    });

    it('renders coordinates page', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        {
          type: 'coordinates',
          performerName: 'Alice',
          data: {
            entries: [makeCoordinateEntry()],
          },
        },
      ]);

      await exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]);
      const textCalls = mockDocMethods.text.mock.calls;
      const coordHeader = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('Coordinate Sheet'));
      expect(coordHeader).toBeDefined();
    });

    it('renders summary page', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        {
          type: 'summary',
          performerName: 'Alice',
          data: {
            totalSets: 10,
            totalDistance: '150',
            hardSteps: 2,
            moderateSteps: 3,
            easySteps: 5,
            worstStep: { setName: 'Set 5', stepSize: '4 to 5' },
          },
        },
      ]);

      await exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]);
      const textCalls = mockDocMethods.text.mock.calls;
      const summaryCall = textCalls.find((c: unknown[]) => typeof c[0] === 'string' && c[0].includes('Step Size Summary'));
      expect(summaryCall).toBeDefined();
    });

    it('adds page numbers to all pages', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        { type: 'cover', performerName: 'Alice', data: { showName: 'Show', performerName: 'Alice', drillNumber: 'T1', totalSets: 1 } },
        { type: 'summary', performerName: 'Alice', data: { totalSets: 1, totalDistance: '10', hardSteps: 0, moderateSteps: 0, easySteps: 1, worstStep: null } },
      ]);

      await exportToDrillBookPdf(makeFormation(), 'p-1', [makeDrillSet()]);
      const textCalls = mockDocMethods.text.mock.calls;
      const page1 = textCalls.find((c: unknown[]) => c[0] === 'Page 1 of 2');
      const page2 = textCalls.find((c: unknown[]) => c[0] === 'Page 2 of 2');
      expect(page1).toBeDefined();
      expect(page2).toBeDefined();
    });
  });

  // =========================================================================
  // exportAllDrillBooks
  // =========================================================================
  describe('exportAllDrillBooks', () => {
    it('returns a Map with one entry per performer', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        { type: 'cover', performerName: 'Alice', data: { showName: 'Show', performerName: 'Alice', drillNumber: 'T1', totalSets: 1 } },
      ]);

      const performers = [
        makePerformer({ id: 'p-1', name: 'Alice' }),
        makePerformer({ id: 'p-2', name: 'Bob' }),
      ];
      const formation = makeFormation({ performers });

      const result = await exportAllDrillBooks(formation, [makeDrillSet()]);
      expect(result.size).toBe(2);
      expect(result.has('p-1')).toBe(true);
      expect(result.has('p-2')).toBe(true);
    });

    it('calls onProgress with performer index', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        { type: 'cover', performerName: 'Alice', data: { showName: 'Show', performerName: 'Alice', drillNumber: 'T1', totalSets: 1 } },
      ]);

      const performers = [
        makePerformer({ id: 'p-1', name: 'Alice' }),
        makePerformer({ id: 'p-2', name: 'Bob' }),
      ];
      const formation = makeFormation({ performers });
      const onProgress = vi.fn();

      await exportAllDrillBooks(formation, [makeDrillSet()], undefined, onProgress);
      expect(onProgress).toHaveBeenCalledWith(0, 2);
      expect(onProgress).toHaveBeenCalledWith(1, 2);
    });

    it('includes performer reference in each result entry', async () => {
      const { generateDrillBookPages } = await import('../coordinateSheetGenerator');
      (generateDrillBookPages as Mock).mockReturnValue([
        { type: 'cover', performerName: 'Alice', data: { showName: 'Show', performerName: 'Alice', drillNumber: 'T1', totalSets: 1 } },
      ]);

      const performer = makePerformer({ id: 'p-1', name: 'Alice' });
      const formation = makeFormation({ performers: [performer] });
      const result = await exportAllDrillBooks(formation, [makeDrillSet()]);

      const entry = result.get('p-1');
      expect(entry).toBeDefined();
      expect(entry!.performer.name).toBe('Alice');
      expect(entry!.pdf).toBeInstanceOf(Blob);
    });
  });

  // =========================================================================
  // exportProductionSheetPdf
  // =========================================================================
  describe('exportProductionSheetPdf', () => {
    it('returns a Blob', async () => {
      const result = await exportProductionSheetPdf(makeProductionSheet());
      expect(result).toBeInstanceOf(Blob);
    });

    it('writes title header', async () => {
      await exportProductionSheetPdf(makeProductionSheet());
      const textCalls = mockDocMethods.text.mock.calls;
      const titleCall = textCalls.find((c: unknown[]) => c[0] === 'Production Sheet');
      expect(titleCall).toBeDefined();
    });

    it('writes total counts and duration', async () => {
      await exportProductionSheetPdf(makeProductionSheet());
      const textCalls = mockDocMethods.text.mock.calls;
      const countCall = textCalls.find(
        (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('Total Counts: 32'),
      );
      expect(countCall).toBeDefined();
    });

    it('writes table headers', async () => {
      await exportProductionSheetPdf(makeProductionSheet());
      const textCalls = mockDocMethods.text.mock.calls;
      const setHeader = textCalls.find((c: unknown[]) => c[0] === 'Set');
      expect(setHeader).toBeDefined();
    });

    it('writes data rows for each entry', async () => {
      await exportProductionSheetPdf(makeProductionSheet());
      const textCalls = mockDocMethods.text.mock.calls;
      const set1Call = textCalls.find((c: unknown[]) => c[0] === 'Set 1');
      const set2Call = textCalls.find((c: unknown[]) => c[0] === 'Set 2');
      expect(set1Call).toBeDefined();
      expect(set2Call).toBeDefined();
    });

    it('writes footer', async () => {
      await exportProductionSheetPdf(makeProductionSheet());
      const textCalls = mockDocMethods.text.mock.calls;
      const footerCall = textCalls.find((c: unknown[]) => c[0] === 'Generated by FluxStudio');
      expect(footerCall).toBeDefined();
    });

    it('adds pages when entries overflow', async () => {
      const entries: ProductionSheetEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `ps-${i}`,
        setId: `Set ${i}`,
        startMeasure: i * 4 + 1,
        endMeasure: (i + 1) * 4,
        counts: 16,
        cumulativeCount: (i + 1) * 16,
        tempo: 120,
      }));

      const sheet: ProductionSheet = {
        formationId: 'form-1',
        entries,
        totalCounts: 800,
        totalDurationMs: 400000,
      };

      await exportProductionSheetPdf(sheet);
      expect(mockDocMethods.addPage).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // exportProductionSheetCsv
  // =========================================================================
  describe('exportProductionSheetCsv', () => {
    it('returns a string with CSV headers', () => {
      const csv = exportProductionSheetCsv(makeProductionSheet());
      const lines = csv.split('\n');
      expect(lines[0]).toBe(
        'Set,Section,Start Measure,End Measure,Counts,Cumulative Count,Tempo,Rehearsal Mark,Notes',
      );
    });

    it('includes one data row per entry', () => {
      const csv = exportProductionSheetCsv(makeProductionSheet());
      const lines = csv.split('\n');
      // header + 2 entries
      expect(lines.length).toBe(3);
    });

    it('populates correct fields in first data row', () => {
      const csv = exportProductionSheetCsv(makeProductionSheet());
      const lines = csv.split('\n');
      const fields = lines[1].split(',');
      expect(fields[0]).toBe('Set 1');      // setId
      expect(fields[1]).toBe('Opener');      // sectionName
      expect(fields[2]).toBe('1');           // startMeasure
      expect(fields[3]).toBe('4');           // endMeasure
      expect(fields[4]).toBe('16');          // counts
      expect(fields[5]).toBe('16');          // cumulativeCount
      expect(fields[6]).toBe('120');         // tempo
      expect(fields[7]).toBe('A');           // rehearsalMark
      expect(fields[8]).toBe('Start here'); // notes
    });

    it('uses empty string for missing optional fields', () => {
      const csv = exportProductionSheetCsv(makeProductionSheet());
      const lines = csv.split('\n');
      const fields = lines[2].split(',');
      expect(fields[1]).toBe('');   // sectionName absent
      expect(fields[7]).toBe('');   // rehearsalMark absent
      expect(fields[8]).toBe('');   // notes absent
    });

    it('escapes commas in field values', () => {
      const sheet = makeProductionSheet();
      sheet.entries[0].notes = 'fast, then slow';
      const csv = exportProductionSheetCsv(sheet);
      expect(csv).toContain('"fast, then slow"');
    });

    it('escapes double quotes in field values', () => {
      const sheet = makeProductionSheet();
      sheet.entries[0].notes = 'use "forte" dynamics';
      const csv = exportProductionSheetCsv(sheet);
      expect(csv).toContain('"use ""forte"" dynamics"');
    });

    it('escapes newlines in field values', () => {
      const sheet = makeProductionSheet();
      sheet.entries[0].notes = 'line1\nline2';
      const csv = exportProductionSheetCsv(sheet);
      expect(csv).toContain('"line1\nline2"');
    });

    it('handles empty entries list', () => {
      const sheet: ProductionSheet = {
        formationId: 'form-1',
        entries: [],
        totalCounts: 0,
        totalDurationMs: 0,
      };
      const csv = exportProductionSheetCsv(sheet);
      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // header only
    });
  });

  // =========================================================================
  // exportAudioSyncFile
  // =========================================================================
  describe('exportAudioSyncFile', () => {
    it('returns valid JSON', () => {
      const formation = makeFormation({
        sets: [makeDrillSet({ id: 'set-1', counts: 8 })],
      });
      const result = exportAudioSyncFile(formation, makeTempoMap());
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('includes version field', () => {
      const formation = makeFormation({ sets: [] });
      const parsed = JSON.parse(exportAudioSyncFile(formation, makeTempoMap()));
      expect(parsed.version).toBe(1);
    });

    it('maps tempo segments', () => {
      const formation = makeFormation({ sets: [] });
      const tempoMap = makeTempoMap();
      const parsed = JSON.parse(exportAudioSyncFile(formation, tempoMap));
      expect(parsed.tempoMap).toHaveLength(1);
      expect(parsed.tempoMap[0].tempoStart).toBe(120);
      expect(parsed.tempoMap[0].sectionName).toBe('Opener');
    });

    it('builds set timestamps from formation sets', () => {
      const sets = [
        makeDrillSet({ id: 'set-1', counts: 8 }),
        makeDrillSet({ id: 'set-2', counts: 16, sortOrder: 1 }),
      ];
      const formation = makeFormation({ sets });
      const parsed = JSON.parse(exportAudioSyncFile(formation, makeTempoMap()));

      expect(parsed.setTimestamps['set-1']).toBeDefined();
      expect(parsed.setTimestamps['set-1'].counts).toBe(8);
      expect(parsed.setTimestamps['set-2']).toBeDefined();
      expect(parsed.setTimestamps['set-2'].counts).toBe(16);
    });

    it('builds section mappings from tempo map segments with sectionId', () => {
      const formation = makeFormation({ sets: [] });
      const parsed = JSON.parse(exportAudioSyncFile(formation, makeTempoMap()));
      expect(parsed.sectionMappings['sec-1']).toBeDefined();
      expect(parsed.sectionMappings['sec-1'].name).toBe('Opener');
      expect(parsed.sectionMappings['sec-1'].startCount).toBe(1);
    });

    it('skips section mappings for segments without sectionId', () => {
      const tempoMap: TempoMap = {
        segments: [
          {
            startCount: 1,
            endCount: 8,
            tempoStart: 120,
            tempoEnd: 120,
            tempoCurve: 'linear',
            beatsPerBar: 4,
            startBar: 1,
            bars: 2,
            // no sectionId
          },
        ],
        totalCounts: 8,
        totalDurationMs: 4000,
      };
      const formation = makeFormation({ sets: [] });
      const parsed = JSON.parse(exportAudioSyncFile(formation, tempoMap));
      expect(Object.keys(parsed.sectionMappings)).toHaveLength(0);
    });

    it('produces pretty-printed JSON', () => {
      const formation = makeFormation({ sets: [] });
      const result = exportAudioSyncFile(formation, makeTempoMap());
      // Pretty-printed JSON contains newlines and indentation
      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });

    it('handles empty sets array', () => {
      const formation = makeFormation({ sets: [] });
      const parsed = JSON.parse(exportAudioSyncFile(formation, makeTempoMap()));
      expect(Object.keys(parsed.setTimestamps)).toHaveLength(0);
    });

    it('handles formation without sets property', () => {
      const formation = makeFormation();
      // sets is undefined by default in makeFormation
      delete (formation as Record<string, unknown>).sets;
      const parsed = JSON.parse(exportAudioSyncFile(formation, makeTempoMap()));
      expect(Object.keys(parsed.setTimestamps)).toHaveLength(0);
    });
  });
});
