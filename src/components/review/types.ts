export interface Annotation {
  id: string;
  x: number; // Percentage from left
  y: number; // Percentage from top
  content: string;
  type: 'comment' | 'suggestion' | 'approval' | 'change-request';
  status: 'open' | 'resolved' | 'dismissed';
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  replies?: AnnotationReply[];
  created_at: string;
  updated_at: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AnnotationReply {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  created_at: string;
}

export interface DesignFile {
  id: string;
  name: string;
  url: string;
  thumbnail_url?: string;
  version: number;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  annotations: Annotation[];
}

export interface ReviewSession {
  id: string;
  file_id: string;
  status: 'active' | 'completed' | 'cancelled';
  participants: Array<{
    id: string;
    name: string;
    role: string;
    status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  }>;
  deadline?: string;
  created_at: string;
  completed_at?: string;
}

export interface DesignReviewWorkflowProps {
  files: DesignFile[];
  currentFile?: DesignFile;
  reviewSession?: ReviewSession;
  onFileSelect?: (file: DesignFile) => void;
  onAnnotationAdd?: (annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => void;
  onAnnotationUpdate?: (id: string, updates: Partial<Annotation>) => void;
  onStatusChange?: (fileId: string, status: DesignFile['status']) => void;
  onFileUpload?: (file: File, version?: number) => void;
  isReadOnly?: boolean;
}
