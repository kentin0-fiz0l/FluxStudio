import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer, Palette } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDesignReview } from '@/hooks/useDesignReview';
import { annotationTypeConfig } from './constants';
import { AnnotationPanel } from './AnnotationPanel';
import { ReviewSidebar } from './ReviewSidebar';
import { ReviewToolbar } from './ReviewToolbar';
import type { DesignReviewWorkflowProps } from './types';

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
  const {
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
  } = useDesignReview({
    currentFile,
    files,
    reviewSession,
    isReadOnly,
    onFileSelect,
    onAnnotationAdd,
    onStatusChange,
  });

  if (!selectedFile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Palette className="h-12 w-12 mx-auto mb-4 text-gray-300" aria-hidden="true" />
          <h3 className="font-medium text-gray-900 mb-2">No design files</h3>
          <p className="text-sm">Upload design files to start the review process</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - File List & Review Status */}
      <ReviewSidebar
        files={files}
        selectedFile={selectedFile}
        reviewSession={reviewSession}
        isReadOnly={isReadOnly}
        onFileSelect={handleFileSelect}
        onFileUpload={onFileUpload}
        getReviewProgress={getReviewProgress}
      />

      {/* Main Content - Image Viewer */}
      <div className="flex-1 flex flex-col">
        <ReviewToolbar
          selectedFile={selectedFile}
          zoom={zoom}
          setZoom={setZoom}
          annotationType={annotationType}
          setAnnotationType={setAnnotationType}
          isAddingAnnotation={isAddingAnnotation}
          setIsAddingAnnotation={setIsAddingAnnotation}
          onStatusChange={handleStatusChange}
          isReadOnly={isReadOnly}
        />

        {/* Image Container */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          <div
            ref={imageRef}
            role="application"
            tabIndex={0}
            aria-label="Design review canvas"
            className={cn(
              "w-full h-full flex items-center justify-center",
              isAddingAnnotation && "cursor-crosshair"
            )}
            style={{
              transform: `scale(${zoom}) translate(${panPosition.x}px, ${panPosition.y}px)`
            }}
            onClick={handleImageClick}
            onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
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
                      <TypeIcon className="h-4 w-4" aria-hidden="true" />
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
                <MousePointer className="h-4 w-4" aria-hidden="true" />
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

export default DesignReviewWorkflow;
