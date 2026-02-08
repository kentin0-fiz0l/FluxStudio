import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Share2,
  MousePointer,
  Edit3,
  Type,
  Circle,
  Square,
  ArrowRight,
  User,
  Calendar,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import {
  DesignReview,
  ImageAnnotation,
  MessageUser
} from '../../types/messaging';

interface DesignReviewWidgetProps {
  review?: DesignReview;
  onApprove?: (reviewId: string, feedback: string) => void;
  onReject?: (reviewId: string, feedback: string) => void;
  onRequestRevision?: (reviewId: string, feedback: string, annotations: ImageAnnotation[]) => void;
  className?: string;
}

interface AnnotationTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  cursor: string;
}

interface DesignVersion {
  id: string;
  version: string;
  uploadedAt: Date;
  uploadedBy: MessageUser;
  changes: string[];
  isActive: boolean;
  fileUrl: string;
  thumbnail: string;
}

// Factory functions to create mock data with fresh dates
function createMockDesignReview(): DesignReview {
  const now = Date.now();
  return {
    id: 'review-1',
    messageId: 'msg-1',
    fileId: 'file-1',
    projectId: 'project-1',
    reviewType: 'initial',
    status: 'in_review',
    reviewer: { id: 'client-1', name: 'Director Johnson', userType: 'client', avatar: '/avatars/director.jpg' },
    assignedTo: [
      { id: 'kentino', name: 'Kentino', userType: 'designer', avatar: '/avatars/kentino.jpg' }
    ],
    feedback: {
      overall: '',
      annotations: [],
      suggestions: [],
      approved: false
    },
    deadline: new Date(now + 48 * 60 * 60 * 1000), // 48 hours from now
    createdAt: new Date(now - 2 * 60 * 60 * 1000) // 2 hours ago
  };
}

function createMockDesignVersions(): DesignVersion[] {
  const now = Date.now();
  return [
    {
      id: 'version-3',
      version: 'v3.0',
      uploadedAt: new Date(now - 1 * 60 * 60 * 1000),
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      changes: ['Updated color scheme based on feedback', 'Adjusted logo placement', 'Refined typography'],
      isActive: true,
      fileUrl: '/designs/uniform-v3.jpg',
      thumbnail: '/thumbnails/uniform-v3-thumb.jpg'
    },
    {
      id: 'version-2',
      version: 'v2.1',
      uploadedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      changes: ['Initial client feedback integration', 'Color variations added'],
      isActive: false,
      fileUrl: '/designs/uniform-v2.jpg',
      thumbnail: '/thumbnails/uniform-v2-thumb.jpg'
    },
    {
      id: 'version-1',
      version: 'v1.0',
      uploadedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      uploadedBy: { id: 'kentino', name: 'Kentino', userType: 'designer' },
      changes: ['Initial concept'],
      isActive: false,
      fileUrl: '/designs/uniform-v1.jpg',
      thumbnail: '/thumbnails/uniform-v1-thumb.jpg'
    }
  ];
}

// Default mock data - initialized once
const defaultMockDesignReview = createMockDesignReview();
const defaultMockDesignVersions = createMockDesignVersions();

const annotationTools: AnnotationTool[] = [
  { id: 'point', name: 'Point', icon: MousePointer, cursor: 'crosshair' },
  { id: 'text', name: 'Text', icon: Type, cursor: 'text' },
  { id: 'rectangle', name: 'Rectangle', icon: Square, cursor: 'crosshair' },
  { id: 'circle', name: 'Circle', icon: Circle, cursor: 'crosshair' },
  { id: 'arrow', name: 'Arrow', icon: ArrowRight, cursor: 'crosshair' }
];

const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];

function AnnotationCanvas({
  imageUrl,
  annotations,
  onAnnotationAdd,
  activeTool,
  activeColor,
  className = ''
}: {
  imageUrl: string;
  annotations: ImageAnnotation[];
  onAnnotationAdd: (annotation: Omit<ImageAnnotation, 'id' | 'createdAt' | 'createdBy'>) => void;
  activeTool: string;
  activeColor: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [tempAnnotation, setTempAnnotation] = useState<Partial<ImageAnnotation> | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || activeTool === 'move') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setStartPos({ x, y });
    setIsDrawing(true);

    if (activeTool === 'point') {
      // Point annotations are created immediately
      onAnnotationAdd({
        x,
        y,
        type: 'point',
        color: activeColor,
        content: `Point annotation at ${x.toFixed(1)}%, ${y.toFixed(1)}%`
      });
      setIsDrawing(false);
    } else if (activeTool === 'text') {
      // Text annotations need content input
      const content = prompt('Enter annotation text:');
      if (content) {
        onAnnotationAdd({
          x,
          y,
          type: 'text',
          color: activeColor,
          content
        });
      }
      setIsDrawing(false);
    }
  }, [activeTool, activeColor, onAnnotationAdd]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'rectangle' || activeTool === 'circle') {
      setTempAnnotation({
        x: Math.min(startPos.x, currentX),
        y: Math.min(startPos.y, currentY),
        width: Math.abs(currentX - startPos.x),
        height: Math.abs(currentY - startPos.y),
        type: activeTool,
        color: activeColor,
        content: `${activeTool} annotation`
      });
    }
  }, [isDrawing, startPos, activeTool, activeColor]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !tempAnnotation) return;

    if (tempAnnotation.width && tempAnnotation.height && tempAnnotation.width > 1 && tempAnnotation.height > 1) {
      onAnnotationAdd({
        x: tempAnnotation.x!,
        y: tempAnnotation.y!,
        width: tempAnnotation.width,
        height: tempAnnotation.height,
        type: tempAnnotation.type!,
        color: tempAnnotation.color!,
        content: tempAnnotation.content!
      });
    }

    setIsDrawing(false);
    setStartPos(null);
    setTempAnnotation(null);
  }, [isDrawing, tempAnnotation, onAnnotationAdd]);

  return (
    <div
      ref={canvasRef}
      className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}
      style={{ cursor: annotationTools.find(t => t.id === activeTool)?.cursor || 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <img
        src={imageUrl}
        alt="Design for review"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Existing annotations */}
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className="absolute pointer-events-none"
          style={{
            left: `${annotation.x}%`,
            top: `${annotation.y}%`,
            width: annotation.width ? `${annotation.width}%` : 'auto',
            height: annotation.height ? `${annotation.height}%` : 'auto'
          }}
        >
          {annotation.type === 'point' && (
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
              style={{ backgroundColor: annotation.color }}
            >
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          )}

          {annotation.type === 'rectangle' && (
            <div
              className="border-2 border-white shadow-lg bg-opacity-20"
              style={{
                borderColor: annotation.color,
                backgroundColor: annotation.color
              }}
            />
          )}

          {annotation.type === 'circle' && (
            <div
              className="border-2 border-white shadow-lg bg-opacity-20 rounded-full"
              style={{
                borderColor: annotation.color,
                backgroundColor: annotation.color
              }}
            />
          )}

          {annotation.type === 'text' && (
            <div
              className="px-2 py-1 rounded text-xs font-medium text-white shadow-lg max-w-32"
              style={{ backgroundColor: annotation.color }}
            >
              {annotation.content}
            </div>
          )}
        </div>
      ))}

      {/* Temporary annotation while drawing */}
      {tempAnnotation && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${tempAnnotation.x}%`,
            top: `${tempAnnotation.y}%`,
            width: `${tempAnnotation.width}%`,
            height: `${tempAnnotation.height}%`
          }}
        >
          {tempAnnotation.type === 'rectangle' && (
            <div
              className="border-2 border-dashed bg-opacity-20"
              style={{
                borderColor: tempAnnotation.color,
                backgroundColor: tempAnnotation.color
              }}
            />
          )}

          {tempAnnotation.type === 'circle' && (
            <div
              className="border-2 border-dashed bg-opacity-20 rounded-full"
              style={{
                borderColor: tempAnnotation.color,
                backgroundColor: tempAnnotation.color
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: DesignReview['status'] }) {
  const getStatusConfig = (status: DesignReview['status']) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Pending Review' };
      case 'in_review':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Eye, label: 'In Review' };
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Approved' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' };
      case 'needs_revision':
        return { bg: 'bg-orange-100', text: 'text-orange-800', icon: Edit3, label: 'Needs Revision' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

export function DesignReviewWidget({
  review = defaultMockDesignReview,
  onApprove,
  onReject,
  onRequestRevision,
  className = ''
}: DesignReviewWidgetProps) {
  const [activeVersion, setActiveVersion] = useState(defaultMockDesignVersions[0]);
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>(review.feedback.annotations || []);
  const [activeTool, setActiveTool] = useState('point');
  const [activeColor, setActiveColor] = useState(colors[0]);
  const [feedback, setFeedback] = useState('');
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const handleAnnotationAdd = useCallback((annotation: Omit<ImageAnnotation, 'id' | 'createdAt' | 'createdBy'>) => {
    const newAnnotation: ImageAnnotation = {
      ...annotation,
      id: `annotation-${Date.now()}`,
      createdAt: new Date(),
      createdBy: { id: 'current-user', name: 'Current User', userType: 'client' }
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  }, []);

  const handleApprove = () => {
    if (onApprove) {
      onApprove(review.id, feedback);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(review.id, feedback);
    }
  };

  const handleRequestRevision = () => {
    if (onRequestRevision) {
      onRequestRevision(review.id, feedback, annotations);
    }
  };

  // Use useState with lazy initializer to avoid Date.now() during render
  const [currentTime] = useState(() => Date.now());
  const timeUntilDeadline = review.deadline ? review.deadline.getTime() - currentTime : 0;
  const hoursUntilDeadline = Math.max(0, Math.ceil(timeUntilDeadline / (1000 * 60 * 60)));
  const isDeadlineNear = hoursUntilDeadline <= 24;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Star size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Design Review</h3>
              <p className="text-sm text-gray-500">Fall 2024 Uniform Concepts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ReviewStatusBadge status={review.status} />
            {isDeadlineNear && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <AlertTriangle size={12} />
                {hoursUntilDeadline}h left
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>Reviewer: {review.reviewer.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>Created: {review.createdAt.toLocaleDateString()}</span>
            </div>
          </div>

          <button
            onClick={() => setShowVersions(!showVersions)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {defaultMockDesignVersions.length} versions
          </button>
        </div>
      </div>

      {/* Version History */}
      <AnimatePresence>
        {showVersions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 bg-gray-50"
          >
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Version History</h4>
              <div className="space-y-2">
                {defaultMockDesignVersions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setActiveVersion(version)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      activeVersion.id === version.id
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{version.version}</span>
                      <span className="text-xs text-gray-500">
                        {version.uploadedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      by {version.uploadedBy.name}
                    </p>
                    <div className="text-xs text-gray-500">
                      {version.changes.join(' • ')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotation Tools */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAnnotating(!isAnnotating)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isAnnotating
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Edit3 size={16} className="mr-2" />
              {isAnnotating ? 'Stop Annotating' : 'Add Annotations'}
            </button>

            {annotations.length > 0 && (
              <span className="text-sm text-gray-500">
                {annotations.length} annotation{annotations.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Download size={16} />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {isAnnotating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
              {annotationTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`p-2 rounded transition-colors ${
                    activeTool === tool.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={tool.name}
                >
                  <tool.icon size={16} />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setActiveColor(color)}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    activeColor === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Design Canvas */}
      <div className="p-4">
        <AnnotationCanvas
          imageUrl={activeVersion.fileUrl}
          annotations={annotations}
          onAnnotationAdd={handleAnnotationAdd}
          activeTool={activeTool}
          activeColor={activeColor}
          className="w-full h-64 mb-4"
        />

        {/* Feedback Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts on this design..."
              className="w-full h-24 px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          {review.status === 'in_review' && (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={!feedback.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ThumbsUp size={16} />
                Approve
              </button>

              <button
                onClick={handleRequestRevision}
                disabled={!feedback.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Edit3 size={16} />
                Request Revision
              </button>

              <button
                onClick={handleReject}
                disabled={!feedback.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ThumbsDown size={16} />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DesignReviewWidget;