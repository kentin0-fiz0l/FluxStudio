import { useState, useRef } from 'react';
import { useAuth } from '@/store/slices/authSlice';
import type { Annotation, DesignFile, ReviewSession } from '@/components/review/types';

interface UseDesignReviewOptions {
  currentFile?: DesignFile;
  files: DesignFile[];
  reviewSession?: ReviewSession;
  isReadOnly?: boolean;
  onFileSelect?: (file: DesignFile) => void;
  onAnnotationAdd?: (annotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'>) => void;
  onStatusChange?: (fileId: string, status: DesignFile['status']) => void;
}

export function useDesignReview({
  currentFile,
  files,
  reviewSession,
  isReadOnly = false,
  onFileSelect,
  onAnnotationAdd,
  onStatusChange,
}: UseDesignReviewOptions) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<DesignFile | null>(currentFile || files[0] || null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [annotationType, setAnnotationType] = useState<Annotation['type']>('comment');
  const [zoom, setZoom] = useState(1);
  const [panPosition] = useState({ x: 0, y: 0 });
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = (file: DesignFile) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingAnnotation || !selectedFile || isReadOnly) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Omit<Annotation, 'id' | 'created_at' | 'updated_at'> = {
      x,
      y,
      content: '',
      type: annotationType,
      status: 'open',
      author: {
        id: user?.id || '',
        name: user?.name || '',
        avatar: user?.avatar,
        role: user?.userType || 'client'
      },
      replies: [],
      priority: 'medium'
    };

    if (onAnnotationAdd) {
      onAnnotationAdd(newAnnotation);
    }

    setIsAddingAnnotation(false);
  };

  const getAnnotationPosition = (annotation: Annotation) => {
    return {
      left: `${annotation.x}%`,
      top: `${annotation.y}%`
    };
  };

  const handleStatusChange = (status: DesignFile['status']) => {
    if (!selectedFile || isReadOnly) return;
    if (onStatusChange) {
      onStatusChange(selectedFile.id, status);
    }
  };

  const getReviewProgress = () => {
    if (!reviewSession) return 0;
    const completed = reviewSession.participants.filter(p => p.status !== 'pending').length;
    return (completed / reviewSession.participants.length) * 100;
  };

  return {
    user,
    selectedFile,
    isAddingAnnotation,
    setIsAddingAnnotation,
    annotationType,
    setAnnotationType,
    zoom,
    setZoom,
    panPosition,
    selectedAnnotation,
    setSelectedAnnotation,
    imageRef,
    handleFileSelect,
    handleImageClick,
    getAnnotationPosition,
    handleStatusChange,
    getReviewProgress,
  };
}
