const { z } = require('zod');

const createProjectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  organizationId: z.string().uuid('Invalid organization ID').optional(),
  teamId: z.string().uuid('Invalid team ID').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  projectType: z.string().optional(),
  serviceCategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  serviceTier: z.string().optional(),
  ensembleType: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  members: z.array(z.string()).optional(),
  templateId: z.string().optional(),
  templateVariables: z.record(z.unknown()).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const addProjectMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'admin', 'contributor', 'viewer']).optional().default('contributor'),
});

const updateProjectMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'contributor', 'viewer'], { required_error: 'Role is required' }),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
};
