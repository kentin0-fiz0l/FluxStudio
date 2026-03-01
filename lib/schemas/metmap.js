const { z } = require('zod');

const createSongSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid().optional().nullable(),
  bpmDefault: z.number().positive().optional(),
  timeSignatureDefault: z.string().max(20).optional(),
});

const updateSongSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  projectId: z.string().uuid().optional().nullable(),
  bpmDefault: z.number().positive().optional(),
  timeSignatureDefault: z.string().max(20).optional(),
});

const songBeatMapSchema = z.object({
  beatMap: z.unknown().refine(val => val !== undefined, { message: 'beatMap is required' }),
  detectedBpm: z.number().positive().optional(),
  audioDurationSeconds: z.number().min(0).optional(),
});

const upsertSectionsSchema = z.object({
  sections: z.array(z.unknown(), { required_error: 'sections array is required' }),
});

const upsertChordsSchema = z.object({
  chords: z.array(
    z.object({
      symbol: z.string().min(1, 'Each chord must have a symbol'),
    }).passthrough(),
    { required_error: 'chords array is required' }
  ),
});

const startPracticeSchema = z.object({
  settings: z.object({}).passthrough().optional(),
});

const endPracticeSchema = z.object({
  notes: z.string().max(5000).optional(),
});

const updateTrackSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  volume: z.number().min(0).max(1).optional(),
  pan: z.number().min(-1).max(1).optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
});

const reorderTrackSchema = z.object({
  sortOrder: z.number().int({ message: 'sortOrder must be a number' }),
});

const trackBeatMapSchema = z.object({
  beatMap: z.unknown().refine(val => val !== undefined, { message: 'beatMap is required' }),
});

const createSnapshotSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  description: z.string().max(2000).optional(),
  sectionCount: z.number().int().min(0).optional(),
  totalBars: z.number().int().min(0).optional(),
});

const createBranchSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  description: z.string().max(2000).optional(),
  sourceSnapshotId: z.string().uuid().optional().nullable(),
});

module.exports = {
  createSongSchema,
  updateSongSchema,
  songBeatMapSchema,
  upsertSectionsSchema,
  upsertChordsSchema,
  startPracticeSchema,
  endPracticeSchema,
  updateTrackSchema,
  reorderTrackSchema,
  trackBeatMapSchema,
  createSnapshotSchema,
  createBranchSchema,
};
