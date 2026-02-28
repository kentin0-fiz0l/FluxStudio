import type { LucideIcon } from 'lucide-react';

export interface FrecencyEntry {
  count: number;
  lastUsed: number; // epoch ms
}

export type FrecencyStore = Record<string, FrecencyEntry>;

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string[];
  action: () => void;
  category?: 'navigation' | 'actions' | 'create' | 'recent';
  keywords?: string[];
  /** If true, action is executed directly (e.g., opens modal) instead of navigating */
  isDirect?: boolean;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject?: () => void;
  onUploadFile?: () => void;
  onCreateTask?: () => void;
  onSendMessage?: () => void;
  projects?: Array<{ id: string; name: string }>;
  /** Current project context for context-aware actions */
  currentProject?: { id: string; name: string } | null;
}
