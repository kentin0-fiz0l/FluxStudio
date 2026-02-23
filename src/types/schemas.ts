/**
 * Zod Validation Schemas
 *
 * Shared schemas for form validation via react-hook-form + zodResolver.
 * Sprint 54: Standardized validation patterns.
 */

import { z } from 'zod';

// ─── Project Creation ───────────────────────────────────────────────────────

export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must be under 100 characters'),
  description: z.string().max(2000, 'Description must be under 2000 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  startDate: z.string().min(1, 'Start date is required'),
  dueDate: z.string(),
  teamId: z.string(),
}).superRefine((data, ctx) => {
  if (data.dueDate && data.startDate && new Date(data.dueDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Due date must be after start date',
      path: ['dueDate'],
    });
  }
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;
