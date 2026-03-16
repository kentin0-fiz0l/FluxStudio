/**
 * Hooks Barrel Export
 *
 * Re-exports all hooks from domain subdirectories for backward compatibility.
 * Prefer importing directly from subdirectories for clarity:
 *   import { useFormations } from '@/hooks/formation'
 *   import { useProjects } from '@/hooks/project'
 */

// Domain subdirectories
export * from './formation';
export * from './collaboration';
export * from './project';
export * from './metmap';
export * from './ui';
export * from './auth';
export * from './ai';
export * from './messaging';
