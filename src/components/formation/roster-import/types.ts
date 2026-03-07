/**
 * Shared types and constants for the PerformerRosterImport wizard
 */

// ============================================================================
// TYPES
// ============================================================================

export type WizardStep = 'upload' | 'map' | 'preview' | 'import';

export type PerformerField =
  | 'name'
  | 'label'
  | 'color'
  | 'instrument'
  | 'section'
  | 'drillNumber'
  | 'group';

export type MergeMode = 'add' | 'replace' | 'merge';

export interface ColumnMapping {
  [columnIndex: number]: PerformerField | 'skip';
}

export interface ValidationIssue {
  row: number;
  field: string;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const STEPS: WizardStep[] = ['upload', 'map', 'preview', 'import'];

export const STEP_LABELS: Record<WizardStep, string> = {
  upload: 'Upload File',
  map: 'Map Columns',
  preview: 'Preview',
  import: 'Import',
};

export const PERFORMER_FIELDS: { value: PerformerField; label: string; required: boolean }[] = [
  { value: 'name', label: 'Name', required: true },
  { value: 'label', label: 'Label', required: false },
  { value: 'color', label: 'Color', required: false },
  { value: 'instrument', label: 'Instrument', required: false },
  { value: 'section', label: 'Section', required: false },
  { value: 'drillNumber', label: 'Drill Number', required: false },
  { value: 'group', label: 'Group', required: false },
];

export const MERGE_OPTIONS: { value: MergeMode; label: string; description: string }[] = [
  {
    value: 'add',
    label: 'Add new only',
    description: 'Keep existing performers, add new ones from file',
  },
  {
    value: 'replace',
    label: 'Replace all',
    description: 'Remove all existing performers, use file data only',
  },
  {
    value: 'merge',
    label: 'Merge by name',
    description: 'Update existing performers by name, add new ones',
  },
];

export const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];
