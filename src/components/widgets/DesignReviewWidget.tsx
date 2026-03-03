import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Download,
  Share2,
  Edit3,
  User,
  Calendar,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import {
  DesignReview,
  ImageAnnotation
} from '../../types/messaging';
import { AnnotationCanvas, annotationTools } from './design-review/AnnotationCanvas';
import { ReviewStatusBadge } from './design-review/ReviewStatusBadge';
import {
  createMockDesignReview,
  createMockDesignVersions,
  colors,
} from './design-review/mock-data';

interface DesignReviewWidgetProps {
  review?: DesignReview;
  onApprove?: (reviewId: string, feedback: string) => void;
  onReject?: (reviewId: string, feedback: string) => void;
  onRequestRevision?: (reviewId: string, feedback: string, annotations: ImageAnnotation[]) => void;
  className?: string;
}

// Default mock data - initialized once
const defaultMockDesignReview = createMockDesignReview();
const defaultMockDesignVersions = createMockDesignVersions();

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
              <Star size={20} className="text-purple-600" aria-hidden="true" />
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
                <AlertTriangle size={12} aria-hidden="true" />
                {hoursUntilDeadline}h left
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <User size={14} aria-hidden="true" />
              <span>Reviewer: {review.reviewer.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} aria-hidden="true" />
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
              <Edit3 size={16} className="mr-2" aria-hidden="true" />
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
              <Download size={16} aria-hidden="true" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Share2 size={16} aria-hidden="true" />
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
                  <tool.icon size={16} aria-hidden="true" />
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
                <ThumbsUp size={16} aria-hidden="true" />
                Approve
              </button>

              <button
                onClick={handleRequestRevision}
                disabled={!feedback.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Edit3 size={16} aria-hidden="true" />
                Request Revision
              </button>

              <button
                onClick={handleReject}
                disabled={!feedback.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ThumbsDown size={16} aria-hidden="true" />
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
