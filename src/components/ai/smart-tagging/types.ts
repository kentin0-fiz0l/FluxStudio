export interface TagData {
  id: string;
  name: string;
  category?: string;
  confidence?: number; // For AI-generated tags (0-1)
  count: number;
  color?: string;
  isAI?: boolean;
  isCustom?: boolean;
  parentId?: string; // For hierarchical tags
  createdAt: Date;
  lastUsed: Date;
}

export interface TagHierarchy {
  tag: TagData;
  children: TagHierarchy[];
}

export interface TagSuggestion {
  name: string;
  confidence: number;
  reason: string;
}

export interface SmartTaggingProps {
  fileId?: string;
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  showAnalytics?: boolean;
  showHierarchy?: boolean;
  allowBulkOperations?: boolean;
}
