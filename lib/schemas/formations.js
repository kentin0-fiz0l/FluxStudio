const { z } = require('zod');

const createFormationSchema = z.object({
  name: z.string().min(1, 'Formation name is required').max(200),
  description: z.string().max(2000).optional(),
  stageWidth: z.number().positive().optional(),
  stageHeight: z.number().positive().optional(),
  gridSize: z.number().positive().optional(),
});

const updateFormationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  stageWidth: z.number().positive().optional(),
  stageHeight: z.number().positive().optional(),
  gridSize: z.number().positive().optional(),
  isArchived: z.boolean().optional(),
  audioTrack: z.unknown().optional(),
});

const saveFormationSchema = z.object({
  name: z.string().max(200).optional(),
  performers: z.array(z.unknown()).optional(),
  keyframes: z.array(z.unknown()).optional(),
});

const formationAudioSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, 'Audio URL is required'),
  filename: z.string().min(1, 'Filename is required'),
  duration: z.number().min(0).optional(),
});

const addPerformerSchema = z.object({
  name: z.string().min(1, 'Performer name is required').max(100),
  label: z.string().min(1, 'Performer label is required').max(50),
  color: z.string().max(50).optional(),
  groupName: z.string().max(100).optional(),
});

const updatePerformerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(50).optional(),
  color: z.string().max(50).optional(),
  groupName: z.string().max(100).optional(),
});

const addKeyframeSchema = z.object({
  timestampMs: z.number().min(0).optional(),
  transition: z.string().max(50).optional(),
  duration: z.number().min(0).optional(),
});

const updateKeyframeSchema = z.object({
  timestampMs: z.number().min(0).optional(),
  transition: z.string().max(50).optional(),
  duration: z.number().min(0).optional(),
});

const setPositionSchema = z.object({
  x: z.number({ required_error: 'Position x is required' }),
  y: z.number({ required_error: 'Position y is required' }),
  rotation: z.number().optional(),
});

const createSceneObjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Scene object name is required'),
  type: z.string().min(1, 'Scene object type is required'),
  position: z.object({}).passthrough(),
  source: z.string().min(1, 'Scene object source is required'),
  attachedToPerformerId: z.string().optional().nullable(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  layer: z.number().optional(),
});

const updateSceneObjectSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  position: z.object({}).passthrough().optional(),
  source: z.string().min(1).optional(),
  attachedToPerformerId: z.string().optional().nullable(),
  visible: z.boolean().optional(),
  locked: z.boolean().optional(),
  layer: z.number().optional(),
});

const bulkSyncSceneObjectsSchema = z.object({
  objects: z.array(z.unknown(), { required_error: 'objects array is required' }),
});

module.exports = {
  createFormationSchema,
  updateFormationSchema,
  saveFormationSchema,
  formationAudioSchema,
  addPerformerSchema,
  updatePerformerSchema,
  addKeyframeSchema,
  updateKeyframeSchema,
  setPositionSchema,
  createSceneObjectSchema,
  updateSceneObjectSchema,
  bulkSyncSceneObjectsSchema,
};
