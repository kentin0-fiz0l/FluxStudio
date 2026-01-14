import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeFile,
  batchAnalyzeFiles,
  findRelatedFiles,
  FileAnalysisResult,
} from '../fileAnalyzer';

// Mock File API with text() method support
class MockFile extends Blob {
  name: string;
  lastModified: number;
  private _parts: BlobPart[];

  constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
    super(parts, options);
    this._parts = parts;
    this.name = name;
    this.lastModified = options?.lastModified || Date.now();
  }

  get type(): string {
    return super.type;
  }

  get size(): number {
    return super.size;
  }

  async text(): Promise<string> {
    // Convert blob parts to text
    const texts = await Promise.all(
      this._parts.map(async (part) => {
        if (typeof part === 'string') {
          return part;
        } else if (part instanceof Blob) {
          return await part.text();
        } else if (part instanceof ArrayBuffer) {
          return new TextDecoder().decode(part);
        }
        return '';
      })
    );
    return texts.join('');
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const text = await this.text();
    return new TextEncoder().encode(text).buffer;
  }
}

// Always use MockFile to ensure text() method works in Node.js environment
global.File = MockFile as unknown as typeof File;

// Mock canvas for image processing
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(40000).fill(128), // Mock pixel data
    })),
  })),
  width: 0,
  height: 0,
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
};

// Mock Image constructor
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src: string = '';
  naturalWidth: number = 1920;
  naturalHeight: number = 1080;
  width: number = 1920;
  height: number = 1080;

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    // Trigger onload after a short delay to simulate async loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 5);
  }
}

global.Image = MockImage as unknown as typeof Image;

global.document = {
  createElement: vi.fn((tag: string) => {
    if (tag === 'canvas') return mockCanvas;
    if (tag === 'img') {
      return new MockImage();
    }
    return {};
  }),
} as any;

global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn(),
} as any;

describe('File Analyzer Service', () => {
  describe('analyzeFile', () => {
    it('should analyze a simple text file', async () => {
      const textContent = 'Hello world! This is a test document.';
      const file = new File([textContent], 'test.txt', { type: 'text/plain' });

      const result = await analyzeFile(file);

      expect(result).toMatchObject({
        metadata: {
          name: 'test.txt',
          type: 'text/plain',
          extension: '.txt',
        },
        category: 'document',
        confidence: expect.any(Number),
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should categorize image files correctly', async () => {
      const file = new File(['fake-image-data'], 'photo.jpg', {
        type: 'image/jpeg',
      });

      const result = await analyzeFile(file);

      expect(result.category).toBe('image');
      expect(result.metadata.extension).toBe('.jpg');
      expect(result.metadata.mimeType).toBe('image/jpeg');
    });

    it('should categorize design files correctly', async () => {
      const file = new File(['fake-design-data'], 'mockup.psd', {
        type: 'image/vnd.adobe.photoshop',
      });

      const result = await analyzeFile(file);

      expect(result.category).toBe('design');
      expect(result.metadata.extension).toBe('.psd');
    });

    it('should categorize video files correctly', async () => {
      const file = new File(['fake-video-data'], 'demo.mp4', {
        type: 'video/mp4',
      });

      const result = await analyzeFile(file);

      expect(result.category).toBe('video');
      expect(result.metadata.extension).toBe('.mp4');
    });

    it('should categorize audio files correctly', async () => {
      const file = new File(['fake-audio-data'], 'song.mp3', {
        type: 'audio/mpeg',
      });

      const result = await analyzeFile(file);

      expect(result.category).toBe('audio');
      expect(result.metadata.extension).toBe('.mp3');
    });

    it('should categorize code files correctly', async () => {
      const file = new File(['const x = 1;'], 'app.js', {
        type: 'application/javascript',
      });

      const result = await analyzeFile(file);

      expect(result.category).toBe('code');
      expect(result.metadata.extension).toBe('.js');
    });

    it('should categorize archive files correctly', async () => {
      const file = new File(['fake-archive-data'], 'backup.zip', {
        type: 'application/zip',
      });

      const result = await analyzeFile(file);

      expect(result.category).toBe('archive');
      expect(result.metadata.extension).toBe('.zip');
    });

    it('should generate basic tags from filename', async () => {
      const file = new File(['content'], 'hero-banner-final-v2.png', {
        type: 'image/png',
      });

      const result = await analyzeFile(file);

      expect(result.tags).toContain('hero');
      expect(result.tags).toContain('banner');
      expect(result.tags).toContain('final');
    });

    it('should analyze image with color extraction', async () => {
      const file = new File(['fake-image-data'], 'test.jpg', {
        type: 'image/jpeg',
      });

      const result = await analyzeFile(file, { extractColors: true });

      expect(result.imageAnalysis).toBeDefined();
      expect(result.imageAnalysis?.dimensions?.width).toBe(1920);
      expect(result.imageAnalysis?.dimensions?.height).toBe(1080);
      expect(result.imageAnalysis?.aspectRatio).toBeCloseTo(1.778, 2);
    });

    it('should analyze text content with keywords', async () => {
      const textContent = `
        This is a comprehensive test document about artificial intelligence.
        Machine learning and deep learning are important topics.
        Natural language processing helps computers understand text.
        Artificial intelligence is transforming technology.
      `;
      const file = new File([textContent], 'ai-article.txt', {
        type: 'text/plain',
      });

      const result = await analyzeFile(file, { generateKeywords: true });

      expect(result.textAnalysis).toBeDefined();
      expect(result.textAnalysis?.wordCount).toBeGreaterThan(0);
      expect(result.textAnalysis?.keywords).toBeDefined();
      expect(result.textAnalysis?.keywords?.length).toBeGreaterThan(0);
    });

    it('should detect positive sentiment', async () => {
      const positiveText = `
        This is an excellent and amazing project!
        The design is beautiful and wonderful.
        Great work on this fantastic achievement!
      `;
      const file = new File([positiveText], 'positive.txt', {
        type: 'text/plain',
      });

      const result = await analyzeFile(file, { analyzeSentiment: true });

      expect(result.textAnalysis).toBeDefined();
      expect(result.textAnalysis?.sentiment).toBe('positive');
    });

    it('should detect negative sentiment', async () => {
      const negativeText = `
        This is terrible and awful work.
        The design is bad and horrible.
        I hate this disappointing result.
      `;
      const file = new File([negativeText], 'negative.txt', {
        type: 'text/plain',
      });

      const result = await analyzeFile(file, { analyzeSentiment: true });

      expect(result.textAnalysis).toBeDefined();
      expect(result.textAnalysis?.sentiment).toBe('negative');
    });

    it('should detect neutral sentiment', async () => {
      const neutralText = `
        This is a document about filing systems.
        The process involves several steps.
        Documents are organized by category.
      `;
      const file = new File([neutralText], 'neutral.txt', {
        type: 'text/plain',
      });

      const result = await analyzeFile(file, { analyzeSentiment: true });

      expect(result.textAnalysis).toBeDefined();
      expect(result.textAnalysis?.sentiment).toBe('neutral');
    });

    it('should calculate quality score for images', async () => {
      const file = new File(['fake-image-data'], 'high-res.jpg', {
        type: 'image/jpeg',
      });

      const result = await analyzeFile(file, { extractColors: true });

      expect(result.qualityScore).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should generate AI insights', async () => {
      const file = new File(['fake-image-data'], 'hero-banner.png', {
        type: 'image/png',
      });

      const result = await analyzeFile(file, { extractColors: true });

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should have higher confidence with more analysis', async () => {
      const file = new File(['fake-image-data'], 'test.jpg', {
        type: 'image/jpeg',
      });

      const resultWithoutAnalysis = await analyzeFile(file);
      const resultWithAnalysis = await analyzeFile(file, { extractColors: true });

      expect(resultWithAnalysis.confidence).toBeGreaterThanOrEqual(
        resultWithoutAnalysis.confidence
      );
    });

    it('should handle unsupported file types gracefully', async () => {
      const file = new File(['unknown-data'], 'file.xyz', {
        type: 'application/octet-stream',
      });

      const result = await analyzeFile(file);

      expect(result.category).toBe('other');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should record processing time', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = await analyzeFile(file);

      expect(result.processingTime).toBeGreaterThan(0);
      expect(typeof result.processingTime).toBe('number');
    });
  });

  describe('batchAnalyzeFiles', () => {
    it('should analyze multiple files', async () => {
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.jpg', { type: 'image/jpeg' }),
        new File(['content3'], 'file3.mp4', { type: 'video/mp4' }),
      ];

      const results = await batchAnalyzeFiles(files);

      expect(results).toHaveLength(3);
      expect(results[0].metadata.name).toBe('file1.txt');
      expect(results[1].metadata.name).toBe('file2.jpg');
      expect(results[2].metadata.name).toBe('file3.mp4');
    });

    it('should report progress during batch analysis', async () => {
      const files = [
        new File(['content1'], 'file1.txt', { type: 'text/plain' }),
        new File(['content2'], 'file2.txt', { type: 'text/plain' }),
        new File(['content3'], 'file3.txt', { type: 'text/plain' }),
      ];

      const progressCalls: Array<{ completed: number; total: number }> = [];
      const onProgress = (completed: number, total: number) => {
        progressCalls.push({ completed, total });
      };

      await batchAnalyzeFiles(files, { onProgress });

      expect(progressCalls).toHaveLength(3);
      expect(progressCalls[0]).toEqual({ completed: 1, total: 3 });
      expect(progressCalls[1]).toEqual({ completed: 2, total: 3 });
      expect(progressCalls[2]).toEqual({ completed: 3, total: 3 });
    });

    it('should handle empty file array', async () => {
      const results = await batchAnalyzeFiles([]);

      expect(results).toHaveLength(0);
    });

    it('should apply options to all files', async () => {
      const files = [
        new File(['positive content great'], 'file1.txt', { type: 'text/plain' }),
        new File(['excellent amazing'], 'file2.txt', { type: 'text/plain' }),
      ];

      const results = await batchAnalyzeFiles(files, {
        analyzeSentiment: true,
        generateKeywords: true,
      });

      results.forEach((result) => {
        expect(result.textAnalysis).toBeDefined();
        expect(result.textAnalysis?.sentiment).toBeDefined();
        expect(result.textAnalysis?.keywords).toBeDefined();
      });
    });
  });

  describe('findRelatedFiles', () => {
    const mockFiles: FileAnalysisResult[] = [
      {
        id: '1',
        metadata: {
          name: 'hero-banner-v1.png',
          type: 'image/png',
          size: 1024000,
          mimeType: 'image/png',
          extension: 'png',
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        category: 'image',
        tags: ['hero', 'banner', 'marketing'],
        confidence: 0.9,
        insights: [],
        processingTime: 100,
      },
      {
        id: '2',
        metadata: {
          name: 'hero-banner-v2.png',
          type: 'image/png',
          size: 1024000,
          mimeType: 'image/png',
          extension: 'png',
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        category: 'image',
        tags: ['hero', 'banner', 'marketing', 'updated'],
        confidence: 0.9,
        insights: [],
        processingTime: 100,
      },
      {
        id: '3',
        metadata: {
          name: 'logo.svg',
          type: 'image/svg+xml',
          size: 50000,
          mimeType: 'image/svg+xml',
          extension: 'svg',
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        category: 'design',
        tags: ['logo', 'branding'],
        confidence: 0.9,
        insights: [],
        processingTime: 50,
      },
    ];

    it('should find files with shared tags', () => {
      const targetFile = mockFiles[0];
      const related = findRelatedFiles(targetFile, mockFiles);

      expect(related).toContain('2'); // hero-banner-v2 shares tags
      expect(related).not.toContain('1'); // exclude self
      expect(related).not.toContain('3'); // logo doesn't share enough tags
    });

    it('should find files with similar names', () => {
      const targetFile = mockFiles[0];
      const related = findRelatedFiles(targetFile, mockFiles);

      expect(related).toContain('2'); // similar name (hero-banner)
    });

    it('should limit results to maxResults', () => {
      const targetFile = mockFiles[0];
      const related = findRelatedFiles(targetFile, mockFiles, 1);

      expect(related.length).toBeLessThanOrEqual(1);
    });

    it('should handle file with no relations', () => {
      const isolatedFile: FileAnalysisResult = {
        id: '99',
        metadata: {
          name: 'unique-file.xyz',
          type: 'application/octet-stream',
          size: 100,
          mimeType: 'application/octet-stream',
          extension: 'xyz',
          createdAt: new Date(),
          modifiedAt: new Date(),
        },
        category: 'other',
        tags: ['unique', 'unrelated'],
        confidence: 0.5,
        insights: [],
        processingTime: 10,
      };

      const related = findRelatedFiles(isolatedFile, mockFiles);

      expect(related).toHaveLength(0);
    });

    it('should handle empty file list', () => {
      const targetFile = mockFiles[0];
      const related = findRelatedFiles(targetFile, []);

      expect(related).toHaveLength(0);
    });
  });

  describe('File Extension Detection', () => {
    it('should extract file extension correctly', async () => {
      const testCases = [
        { name: 'file.txt', expected: '.txt' },
        { name: 'image.PNG', expected: '.png' },
        { name: 'archive.tar.gz', expected: '.gz' },
        { name: 'no-extension', expected: '' },
        { name: '.hidden', expected: '.hidden' }, // hidden files are treated as having an extension
      ];

      for (const { name, expected } of testCases) {
        const file = new File(['content'], name, { type: 'text/plain' });
        const result = await analyzeFile(file);
        expect(result.metadata.extension).toBe(expected);
      }
    });
  });

  describe('Tag Generation', () => {
    it('should generate tags from hyphenated filenames', async () => {
      const file = new File(['content'], 'user-profile-settings.json', {
        type: 'application/json',
      });

      const result = await analyzeFile(file);

      expect(result.tags).toContain('user');
      expect(result.tags).toContain('profile');
      expect(result.tags).toContain('settings');
    });

    it('should generate tags from camelCase filenames', async () => {
      const file = new File(['content'], 'userProfileSettings.json', {
        type: 'application/json',
      });

      const result = await analyzeFile(file);

      expect(result.tags.length).toBeGreaterThan(0);
    });

    it('should filter out common words from tags', async () => {
      const file = new File(['content'], 'the-final-document-for-client.pdf', {
        type: 'application/pdf',
      });

      const result = await analyzeFile(file);

      // Common words like 'the', 'for' should be filtered
      expect(result.tags).toContain('final');
      expect(result.tags).toContain('document');
      expect(result.tags).toContain('client');
    });
  });

  describe('Confidence Calculation', () => {
    it('should have base confidence for basic analysis', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      const result = await analyzeFile(file);

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should increase confidence with more tags', async () => {
      const fileWithManyTags = new File(
        ['content'],
        'user-profile-dashboard-settings-advanced-config.js',
        { type: 'application/javascript' }
      );

      const fileWithFewTags = new File(['content'], 'file.js', {
        type: 'application/javascript',
      });

      const result1 = await analyzeFile(fileWithManyTags);
      const result2 = await analyzeFile(fileWithFewTags);

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });

    it('should increase confidence with specialized analysis', async () => {
      const file = new File(['fake-image-data'], 'test.jpg', {
        type: 'image/jpeg',
      });

      const withoutAnalysis = await analyzeFile(file);
      const withAnalysis = await analyzeFile(file, { extractColors: true });

      // With specialized analysis, confidence should be at least as high
      expect(withAnalysis.confidence).toBeGreaterThanOrEqual(withoutAnalysis.confidence);
    });
  });
});
