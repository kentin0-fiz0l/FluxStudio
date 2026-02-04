import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  X,
  Edit3,
  Eye,
  Download,
  Share2,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Pencil,
  MousePointer,
  Reply,
  ThumbsUp,
  Flag,
  Palette,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface Annotation {
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

interface AnnotationReply {
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

interface DesignFile {
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

interface ReviewSession {
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

interface DesignReviewWorkflowProps {
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

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-500', icon: Edit3 },
  review: { label: 'In Review', color: 'bg-blue-500', icon: Eye },
  approved: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  rejected: { label: 'Changes Needed', color: 'bg-red-500', icon: XCircle }
};

const annotationTypeConfig = {
  comment: { label: 'Comment', color: 'bg-blue-500', icon: MessageSquare },
  suggestion: { label: 'Suggestion', color: 'bg-yellow-500', icon: Pencil },
  approval: { label: 'Approval', color: 'bg-green-500', icon: ThumbsUp },
  'change-request': { label: 'Change Request', color: 'bg-red-500', icon: Flag }
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-blue-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  high: { label: 'High', color: 'bg-red-500' }
};

export function DesignReviewWorkflow({
  files,
  currentFile,
  reviewSession,
  onFileSelect,
  onAnnotationAdd,
  onAnnotationUpdate,
  onStatusChange,
  onFileUpload,
  isReadOnly = false
}: DesignReviewWorkflowProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<DesignFile | null>(currentFile || files[0] || null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [annotationType, setAnnotationType] = useState<Annotation['type']>('comment');
  const [zoom, setZoom] = useState(1);
  const [panPosition] = useState({ x: 0, y: 0 });
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFileSelect = (file: DesignFile) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // Handle image click for annotation
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

  // Calculate annotation position
  const getAnnotationPosition = (annotation: Annotation) => {
    return {
      left: `${annotation.x}%`,
      top: `${annotation.y}%`
    };
  };

  // Handle status change
  const handleStatusChange = (status: DesignFile['status']) => {
    if (!selectedFile || isReadOnly) return;
    if (onStatusChange) {
      onStatusChange(selectedFile.id, status);
    }
  };

  // Calculate review progress
  const getReviewProgress = () => {
    if (!reviewSession) return 0;
    const completed = reviewSession.participants.filter(p => p.status !== 'pending').length;
    return (completed / reviewSession.participants.length) * 100;
  };

  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Palette className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="font-medium text-gray-900 mb-2">No design files</h3>
          <p className="text-sm">Upload design files to start the review process</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - File List & Review Status */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Design Review</h2>
          {reviewSession && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{Math.round(getReviewProgress())}%</span>
              </div>
              <Progress value={getReviewProgress()} className="h-2" />
              {reviewSession.deadline && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  Due {new Date(reviewSession.deadline).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {files.map((file) => {
            const statusInfo = statusConfig[file.status];
            const StatusIcon = statusInfo.icon;
            const openAnnotations = file.annotations?.filter(a => a.status === 'open').length || 0;

            return (
              <Card
                key={file.id}
                className={cn(
                  'cursor-pointer transition-all border-2',
                  selectedFile?.id === file.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => handleFileSelect(file)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {file.thumbnail_url ? (
                      <img
                        src={file.thumbnail_url}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        <Palette className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn('text-white text-xs', statusInfo.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <span className="text-xs text-gray-500">v{file.version}</span>
                      </div>
                      {openAnnotations > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-orange-600">
                          <MessageSquare className="h-3 w-3" />
                          {openAnnotations} open comment{openAnnotations !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Upload New Version */}
        {!isReadOnly && (
          <div className="p-4 border-t border-gray-200">
            <label htmlFor="file-upload" className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 cursor-pointer">
                <Plus className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                <span className="text-sm text-gray-600">Upload new version</span>
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && onFileUpload) {
                    onFileUpload(file, selectedFile.version + 1);
                  }
                }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Main Content - Image Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-gray-900">{selectedFile.name}</h3>
              <Badge className={cn('text-white', statusConfig[selectedFile.status].color)}>
                {statusConfig[selectedFile.status].label}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Annotation Tools */}
              {!isReadOnly && (
                <div className="flex items-center gap-1">
                  <Select value={annotationType} onValueChange={(value) => setAnnotationType(value as Annotation['type'])}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(annotationTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant={isAddingAnnotation ? "primary" : "outline"}
                    onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                  >
                    {isAddingAnnotation ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Comment
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                {!isReadOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => handleStatusChange(status as DesignFile['status'])}
                        >
                          <config.icon className="h-4 w-4 mr-2" />
                          {config.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          <div
            ref={imageRef}
            className={cn(
              "w-full h-full flex items-center justify-center",
              isAddingAnnotation && "cursor-crosshair"
            )}
            style={{
              transform: `scale(${zoom}) translate(${panPosition.x}px, ${panPosition.y}px)`
            }}
            onClick={handleImageClick}
          >
            <div className="relative">
              <img
                src={selectedFile.url}
                alt={selectedFile.name}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />

              {/* Annotations */}
              {selectedFile.annotations?.map((annotation) => {
                const typeConfig = annotationTypeConfig[annotation.type];
                const TypeIcon = typeConfig.icon;

                return (
                  <motion.div
                    key={annotation.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={getAnnotationPosition(annotation)}
                  >
                    <button
                      className={cn(
                        'w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white relative',
                        typeConfig.color,
                        selectedAnnotation === annotation.id && 'ring-2 ring-blue-500'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAnnotation(
                          selectedAnnotation === annotation.id ? null : annotation.id
                        );
                      }}
                    >
                      <TypeIcon className="h-4 w-4" />
                      {annotation.status === 'open' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white" />
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Instruction overlay when adding annotation */}
          {isAddingAnnotation && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Click on the design to add a {annotationTypeConfig[annotationType].label.toLowerCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Annotation Panel */}
      <AnimatePresence>
        {selectedAnnotation && selectedFile.annotations?.find(a => a.id === selectedAnnotation) && (
          <AnnotationPanel
            annotation={selectedFile.annotations.find(a => a.id === selectedAnnotation)!}
            onClose={() => setSelectedAnnotation(null)}
            onUpdate={(updates) => {
              if (onAnnotationUpdate) {
                onAnnotationUpdate(selectedAnnotation, updates);
              }
            }}
            isReadOnly={isReadOnly}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Annotation Panel Component
function AnnotationPanel({
  annotation,
  onClose,
  onUpdate,
  isReadOnly
}: {
  annotation: Annotation;
  onClose: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
  isReadOnly: boolean;
}) {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [editingContent, setEditingContent] = useState(annotation.content);
  const [isEditing, setIsEditing] = useState(!annotation.content); // Auto-edit if no content

  const typeConfig = annotationTypeConfig[annotation.type];
  const priorityInfo = priorityConfig[annotation.priority];
  const TypeIcon = typeConfig.icon;

  const handleSave = () => {
    if (editingContent.trim()) {
      onUpdate({ content: editingContent.trim() });
      setIsEditing(false);
    }
  };

  const handleAddReply = useCallback(() => {
    if (replyContent.trim()) {
      const newReply: AnnotationReply = {
        id: `reply-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`,
        content: replyContent.trim(),
        author: {
          id: user?.id || '',
          name: user?.name || '',
          avatar: user?.avatar,
          role: user?.userType || 'client'
        },
        created_at: new Date().toISOString()
      };

      onUpdate({
        replies: [...(annotation.replies || []), newReply]
      });
      setReplyContent('');
    }
  }, [replyContent, user, annotation.replies, onUpdate]);

  const handleStatusChange = (status: Annotation['status']) => {
    onUpdate({ status });
  };

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="w-96 bg-white border-l border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', typeConfig.color.replace('bg-', 'bg-opacity-20 text-'))}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <span className="font-medium">{typeConfig.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Avatar className="h-6 w-6">
            <AvatarImage src={annotation.author.avatar} />
            <AvatarFallback>{annotation.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span>{annotation.author.name}</span>
          <span>•</span>
          <span>{new Date(annotation.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Main Comment */}
        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                placeholder="Enter your comment..."
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={!editingContent.trim()}>
                  Save
                </Button>
                {annotation.content && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditing(false);
                    setEditingContent(annotation.content);
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-900">{annotation.content}</p>
              {!isReadOnly && annotation.author.id === user?.id && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Status Actions */}
        {!isReadOnly && annotation.status === 'open' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mark as:</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('resolved')}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolved
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('dismissed')}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {annotation.status !== 'open' && (
          <div className="flex items-center gap-2 text-sm">
            {annotation.status === 'resolved' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-500" />
            )}
            <span className="capitalize text-gray-600">{annotation.status}</span>
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange('open')}
                className="ml-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reopen
              </Button>
            )}
          </div>
        )}

        <Separator />

        {/* Replies */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            Replies ({annotation.replies?.length || 0})
          </h4>

          {annotation.replies?.map((reply) => (
            <div key={reply.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="h-6 w-6">
                <AvatarImage src={reply.author.avatar} />
                <AvatarFallback>{reply.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{reply.author.name}</span>
                  <span className="text-gray-500">
                    {new Date(reply.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{reply.content}</p>
              </div>
            </div>
          ))}

          {/* Add Reply */}
          {!isReadOnly && annotation.status === 'open' && (
            <div className="space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Add a reply..."
                rows={2}
              />
              <Button
                size="sm"
                onClick={handleAddReply}
                disabled={!replyContent.trim()}
              >
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
export default DesignReviewWorkflow;
