/**
 * Types for the CollaborativeEditor component
 */

export interface CollaborativeEditorProps {
  fileId: string;
  fileName: string;
  content: string;
  mimeType: string;
  collaborators: string[];
  onSave: (content: string, comment?: string) => void;
  onClose: () => void;
}

export interface Collaborator {
  id: string;
  name: string;
  cursor?: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  lastSeen: string;
  isTyping: boolean;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  authorName: string;
  createdAt: string;
  line?: number;
  resolved: boolean;
}
