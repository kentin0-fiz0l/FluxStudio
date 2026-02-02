/**
 * AI File Analyzer Service
 * Intelligent file content analysis and categorization
 */

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  mimeType: string;
  extension: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface ImageAnalysis {
  dimensions: { width: number; height: number };
  colorPalette: string[];
  dominantColors: string[];
  hasTransparency: boolean;
  format: string;
  aspectRatio: number;
}

export interface TextAnalysis {
  wordCount: number;
  characterCount: number;
  language: string;
  readingTime: number; // minutes
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics: string[];
}

export interface FileAnalysisResult {
  id: string;
  metadata: FileMetadata;
  category: FileCategory;
  tags: string[];
  confidence: number; // 0-1
  imageAnalysis?: ImageAnalysis;
  textAnalysis?: TextAnalysis;
  relatedFiles?: string[];
  qualityScore?: number;
  insights: string[];
  processingTime: number; // ms
}

export type FileCategory =
  | 'design'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'code'
  | 'archive'
  | 'data'
  | 'other';

/**
 * Analyze file and extract intelligent insights
 */
export async function analyzeFile(
  file: File,
  options: {
    extractColors?: boolean;
    analyzeSentiment?: boolean;
    generateKeywords?: boolean;
  } = {}
): Promise<FileAnalysisResult> {
  const startTime = performance.now();

  const metadata: FileMetadata = {
    name: file.name,
    type: file.type,
    size: file.size,
    mimeType: file.type,
    extension: getFileExtension(file.name),
    createdAt: new Date(file.lastModified),
    modifiedAt: new Date(file.lastModified),
  };

  // Categorize file
  const category = categorizeFile(metadata);

  // Generate initial tags
  const tags = await generateBasicTags(file, metadata, category);

  // Perform specialized analysis
  const imageAnalysis = category === 'image' || category === 'design'
    ? await analyzeImage(file, options)
    : undefined;

  const textAnalysis = category === 'document' || metadata.extension === 'txt'
    ? await analyzeText(file, options)
    : undefined;

  // Generate insights
  const insights = generateInsights(metadata, category, imageAnalysis, textAnalysis);

  // Calculate quality score
  const qualityScore = calculateQualityScore(file, imageAnalysis, textAnalysis);

  // Calculate confidence
  const confidence = calculateConfidence(category, tags, imageAnalysis, textAnalysis);

  const processingTime = performance.now() - startTime;

  return {
    id: generateFileId(file),
    metadata,
    category,
    tags,
    confidence,
    imageAnalysis,
    textAnalysis,
    insights,
    qualityScore,
    processingTime,
  };
}

/**
 * Categorize file based on type and extension
 */
function categorizeFile(metadata: FileMetadata): FileCategory {
  const { mimeType, extension } = metadata;

  // Design files
  if (['.psd', '.ai', '.sketch', '.fig', '.xd'].includes(extension)) {
    return 'design';
  }

  // Images
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  // Videos
  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  // Audio
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }

  // Documents
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('text') ||
    ['.doc', '.docx', '.txt', '.md', '.pdf'].includes(extension)
  ) {
    return 'document';
  }

  // Code files
  if (['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.css', '.html'].includes(extension)) {
    return 'code';
  }

  // Archives
  if (['.zip', '.rar', '.tar', '.gz', '.7z'].includes(extension)) {
    return 'archive';
  }

  // Data files
  if (['.json', '.xml', '.csv', '.xlsx', '.sql'].includes(extension)) {
    return 'data';
  }

  return 'other';
}

/**
 * Generate basic tags from file metadata
 */
async function generateBasicTags(
  _file: File,
  metadata: FileMetadata,
  category: FileCategory
): Promise<string[]> {
  const tags: string[] = [];

  // Category tag
  tags.push(category);

  // File type tag
  tags.push(metadata.extension.replace('.', ''));

  // Size-based tags
  if (metadata.size < 100 * 1024) tags.push('small');
  else if (metadata.size < 1024 * 1024) tags.push('medium');
  else if (metadata.size < 10 * 1024 * 1024) tags.push('large');
  else tags.push('very-large');

  // Extract tags from filename
  const nameWords = metadata.name
    .replace(/[_-]/g, ' ')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Add meaningful words from filename
  const commonWords = ['the', 'and', 'for', 'with', 'from', 'file', 'doc', 'img'];
  nameWords.forEach(word => {
    if (!commonWords.includes(word) && !tags.includes(word)) {
      tags.push(word);
    }
  });

  return tags;
}

/**
 * Analyze image file for color palette and properties
 */
async function analyzeImage(
  file: File,
  options: { extractColors?: boolean } = {}
): Promise<ImageAnalysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const analysis: ImageAnalysis = {
        dimensions: {
          width: img.naturalWidth,
          height: img.naturalHeight,
        },
        aspectRatio: img.naturalWidth / img.naturalHeight,
        format: file.type.split('/')[1] || 'unknown',
        hasTransparency: file.type === 'image/png' || file.type === 'image/webp',
        colorPalette: [],
        dominantColors: [],
      };

      // Extract color palette if requested
      if (options.extractColors) {
        const colors = extractColorPalette(img);
        analysis.colorPalette = colors.palette;
        analysis.dominantColors = colors.dominant;
      }

      URL.revokeObjectURL(url);
      resolve(analysis);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to analyze image'));
    };

    img.src = url;
  });
}

/**
 * Extract color palette from image
 */
function extractColorPalette(img: HTMLImageElement): {
  palette: string[];
  dominant: string[];
} {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { palette: [], dominant: [] };
  }

  // Sample image at reduced size for performance
  const sampleSize = 100;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const pixels = imageData.data;

  const colorCounts = new Map<string, number>();

  // Sample every nth pixel for performance
  for (let i = 0; i < pixels.length; i += 40) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    // Quantize colors to reduce palette size
    const qr = Math.round(r / 32) * 32;
    const qg = Math.round(g / 32) * 32;
    const qb = Math.round(b / 32) * 32;

    const color = `#${qr.toString(16).padStart(2, '0')}${qg.toString(16).padStart(2, '0')}${qb.toString(16).padStart(2, '0')}`;

    colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
  }

  // Sort by frequency
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  return {
    palette: sortedColors.slice(0, 10),
    dominant: sortedColors.slice(0, 3),
  };
}

/**
 * Analyze text file content
 */
async function analyzeText(
  file: File,
  options: { analyzeSentiment?: boolean; generateKeywords?: boolean } = {}
): Promise<TextAnalysis> {
  const text = await file.text();

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const characters = text.length;

  // Simple keyword extraction (top frequency words)
  const keywords = options.generateKeywords
    ? extractKeywords(text)
    : [];

  // Detect language (simple heuristic)
  const language = detectLanguage(text);

  // Calculate reading time (average 200 words per minute)
  const readingTime = Math.ceil(words.length / 200);

  // Simple sentiment analysis
  const sentiment = options.analyzeSentiment
    ? analyzeSentiment(text)
    : undefined;

  // Extract topics (simplified)
  const topics = extractTopics(text);

  return {
    wordCount: words.length,
    characterCount: characters,
    language,
    readingTime,
    keywords,
    sentiment,
    topics,
  };
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string, limit: number = 10): string[] {
  const stopWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Detect text language (simplified)
 */
function detectLanguage(text: string): string {
  // Very simple heuristic - in production use a proper language detection library
  const sample = text.slice(0, 1000).toLowerCase();

  if (/[а-яё]/.test(sample)) return 'ru';
  if (/[一-龯]/.test(sample)) return 'zh';
  if (/[ぁ-ん]/.test(sample)) return 'ja';
  if (/[가-힣]/.test(sample)) return 'ko';

  return 'en'; // Default to English
}

/**
 * Analyze text sentiment
 */
function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'happy'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'poor'];

  const lowerText = text.toLowerCase();
  let score = 0;

  positiveWords.forEach(word => {
    const matches = lowerText.match(new RegExp(word, 'g'));
    score += matches ? matches.length : 0;
  });

  negativeWords.forEach(word => {
    const matches = lowerText.match(new RegExp(word, 'g'));
    score -= matches ? matches.length : 0;
  });

  if (score > 2) return 'positive';
  if (score < -2) return 'negative';
  return 'neutral';
}

/**
 * Extract topics from text
 */
function extractTopics(text: string): string[] {
  const topicKeywords = {
    design: ['design', 'ui', 'ux', 'interface', 'layout', 'visual', 'graphic'],
    development: ['code', 'development', 'programming', 'software', 'api', 'function'],
    business: ['business', 'revenue', 'profit', 'customer', 'market', 'sales'],
    project: ['project', 'deadline', 'milestone', 'task', 'team', 'goal'],
  };

  const lowerText = text.toLowerCase();
  const topics: string[] = [];

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    const matches = keywords.filter(kw => lowerText.includes(kw));
    if (matches.length >= 2) {
      topics.push(topic);
    }
  });

  return topics;
}

/**
 * Generate insights about the file
 */
function generateInsights(
  metadata: FileMetadata,
  _category: FileCategory,
  imageAnalysis?: ImageAnalysis,
  textAnalysis?: TextAnalysis
): string[] {
  const insights: string[] = [];

  // Size insights
  if (metadata.size > 10 * 1024 * 1024) {
    insights.push('Large file size - consider compression');
  }

  // Image insights
  if (imageAnalysis) {
    if (imageAnalysis.dimensions.width > 4000) {
      insights.push('High resolution image - suitable for print');
    }

    const aspectRatio = imageAnalysis.aspectRatio;
    if (Math.abs(aspectRatio - 16/9) < 0.1) {
      insights.push('Widescreen aspect ratio (16:9)');
    } else if (Math.abs(aspectRatio - 1) < 0.1) {
      insights.push('Square aspect ratio - ideal for social media');
    }

    if (imageAnalysis.colorPalette.length > 0) {
      insights.push(`Color palette: ${imageAnalysis.dominantColors.join(', ')}`);
    }
  }

  // Text insights
  if (textAnalysis) {
    insights.push(`${textAnalysis.wordCount} words, ~${textAnalysis.readingTime} min read`);

    if (textAnalysis.sentiment) {
      insights.push(`Tone: ${textAnalysis.sentiment}`);
    }

    if (textAnalysis.topics.length > 0) {
      insights.push(`Topics: ${textAnalysis.topics.join(', ')}`);
    }
  }

  return insights;
}

/**
 * Calculate file quality score
 */
function calculateQualityScore(
  file: File,
  imageAnalysis?: ImageAnalysis,
  textAnalysis?: TextAnalysis
): number {
  let score = 50; // Base score

  // Image quality factors
  if (imageAnalysis) {
    const { dimensions } = imageAnalysis;
    const pixels = dimensions.width * dimensions.height;

    // Resolution score
    if (pixels > 4000 * 3000) score += 30;
    else if (pixels > 1920 * 1080) score += 20;
    else if (pixels > 1280 * 720) score += 10;

    // Aspect ratio (standard ratios get bonus)
    const ar = imageAnalysis.aspectRatio;
    if ([16/9, 4/3, 1, 3/2].some(ratio => Math.abs(ar - ratio) < 0.1)) {
      score += 10;
    }

    // File size vs resolution (efficiency)
    const bytesPerPixel = file.size / pixels;
    if (bytesPerPixel < 0.5) score += 10; // Well compressed
  }

  // Text quality factors
  if (textAnalysis) {
    if (textAnalysis.wordCount > 100) score += 10;
    if (textAnalysis.wordCount > 500) score += 10;
    if (textAnalysis.topics.length > 0) score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate confidence in analysis
 */
function calculateConfidence(
  category: FileCategory,
  tags: string[],
  imageAnalysis?: ImageAnalysis,
  textAnalysis?: TextAnalysis
): number {
  let confidence = 0.5; // Base confidence

  // More tags = higher confidence
  confidence += Math.min(tags.length * 0.05, 0.2);

  // Successful specialized analysis increases confidence
  if (imageAnalysis) confidence += 0.15;
  if (textAnalysis) confidence += 0.15;

  // Specific category detection increases confidence
  if (category !== 'other') confidence += 0.1;

  return Math.min(1, confidence);
}

/**
 * Generate unique file ID
 */
function generateFileId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
}

/**
 * Batch analyze multiple files
 */
export async function batchAnalyzeFiles(
  files: File[],
  options: {
    extractColors?: boolean;
    analyzeSentiment?: boolean;
    generateKeywords?: boolean;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<FileAnalysisResult[]> {
  const results: FileAnalysisResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await analyzeFile(files[i], options);
    results.push(result);

    if (options.onProgress) {
      options.onProgress(i + 1, files.length);
    }
  }

  return results;
}

/**
 * Find related files based on analysis
 */
export function findRelatedFiles(
  targetFile: FileAnalysisResult,
  allFiles: FileAnalysisResult[]
): string[] {
  const related: Array<{ id: string; score: number }> = [];

  allFiles.forEach(file => {
    if (file.id === targetFile.id) return;

    let score = 0;

    // Same category
    if (file.category === targetFile.category) score += 2;

    // Shared tags
    const sharedTags = file.tags.filter(tag => targetFile.tags.includes(tag));
    score += sharedTags.length;

    // Similar colors (for images)
    if (file.imageAnalysis && targetFile.imageAnalysis) {
      const sharedColors = file.imageAnalysis.dominantColors.filter(color =>
        targetFile.imageAnalysis!.dominantColors.includes(color)
      );
      score += sharedColors.length * 2;
    }

    // Similar topics (for text)
    if (file.textAnalysis && targetFile.textAnalysis) {
      const sharedTopics = file.textAnalysis.topics.filter(topic =>
        targetFile.textAnalysis!.topics.includes(topic)
      );
      score += sharedTopics.length * 2;
    }

    if (score > 0) {
      related.push({ id: file.id, score });
    }
  });

  // Sort by score and return top 5
  return related
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.id);
}

export default {
  analyzeFile,
  batchAnalyzeFiles,
  findRelatedFiles,
};
