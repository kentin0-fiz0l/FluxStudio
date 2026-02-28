const { z } = require('zod');

const installPluginSchema = z.object({
  manifest: z.object({
    id: z.string().min(1, 'Plugin ID is required'),
    name: z.string().min(1, 'Plugin name is required'),
    version: z.string().min(1, 'Plugin version is required'),
    main: z.string().min(1, 'Plugin main entry is required'),
  }).passthrough(),
});

const updatePluginSettingsSchema = z.object({
  settings: z.record(z.unknown()),
});

module.exports = { installPluginSchema, updatePluginSettingsSchema };
