/**
 * InlineAnnotationViewer Component
 * Lightweight annotation viewer for displaying annotations directly in message threads
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Eye, EyeOff, Camera, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ImageAnnotation, MessageAttachment } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface InlineAnnotationViewerProps {
  attachment: MessageAttachment;
  className?: string;
  onOpenFullAnnotationTool?: () => void;
  onOpenEnhancedViewer?: () => void;
}

export function InlineAnnotationViewer({
  attachment,
  className,
  onOpenFullAnnotationTool,
  onOpenEnhancedViewer
}: InlineAnnotationViewerProps) {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const annotations = attachment.annotations || [];

  useEffect(() => {
    if (imageRef.current && imageLoaded) {
      const updateDimensions = () => {
        if (imageRef.current) {
          const rect = imageRef.current.getBoundingClientRect();
          setImageDimensions({ width: rect.width, height: rect.height });
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [imageLoaded]);

  const getAnnotationPosition = (annotation: ImageAnnotation) => {
    if (!imageRef.current || !imageLoaded) return { x: 0, y: 0 };

    const img = imageRef.current;
    const scaleX = imageDimensions.width / img.naturalWidth;
    const scaleY = imageDimensions.height / img.naturalHeight;

    return {
      x: annotation.x * scaleX,
      y: annotation.y * scaleY
    };
  };

  const getAnnotationIcon = (type: ImageAnnotation['type']) => {
    switch (type) {
      case 'point':
        return '●';
      case 'rectangle':
        return '▢';
      case 'circle':
        return '○';
      case 'arrow':
        return '→';
      case 'text':
        return 'T';
      default:
        return '●';
    }
  };

  const AnnotationMarker = ({ annotation, index }: { annotation: ImageAnnotation; index: number }) => {
    const position = getAnnotationPosition(annotation);
    const isHovered = hoveredAnnotation === annotation.id;

    return (
      <TooltipProvider key={annotation.id}>
        <Tooltip open={isHovered}>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.2 }}
              className="absolute cursor-pointer z-10"
              style={{
                left: position.x - 12,
                top: position.y - 12,
                transform: 'translate(-50%, -50%)'
              }}
              onMouseEnter={() => setHoveredAnnotation(annotation.id)}
              onMouseLeave={() => setHoveredAnnotation(null)}
            >
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: annotation.color }}
              >
                {index + 1}
              </div>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium capitalize">{annotation.type}</span>
                <Badge variant="outline" className="text-xs">
                  {getAnnotationIcon(annotation.type)}
                </Badge>
              </div>
              {annotation.content && (
                <p className="text-sm">{annotation.content}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={annotation.createdBy.avatar} />
                  <AvatarFallback className="text-xs">
                    {annotation.createdBy.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{annotation.createdBy.name}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn('relative group', className)}>
      {/* Image Container */}
      <div ref={containerRef} className="relative overflow-hidden rounded-lg bg-gray-100">
        <img
          ref={imageRef}
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto max-h-64 object-cover"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Annotation Overlay */}
        <AnimatePresence>
          {showAnnotations && imageLoaded && annotations.length > 0 && (
            <div className="absolute inset-0">
              {annotations.map((annotation, index) => (
                <AnnotationMarker
                  key={annotation.id}
                  annotation={annotation}
                  index={index}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Hover Controls */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
            {annotations.length > 0 && (
              <Button
                size="sm"
                variant="secondary"
                className="backdrop-blur-sm"
                onClick={() => setShowAnnotations(!showAnnotations)}
              >
                {showAnnotations ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              className="backdrop-blur-sm"
              onClick={onOpenEnhancedViewer}
            >
              <Maximize2 size={16} />
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="backdrop-blur-sm"
              onClick={onOpenFullAnnotationTool}
            >
              <Camera size={16} />
            </Button>
          </div>
        </div>

        {/* Annotation Count Badge */}
        {annotations.length > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-600 text-white text-xs">
              <MessageCircle size={10} className="mr-1" />
              {annotations.length}
            </Badge>
          </div>
        )}
      </div>

      {/* File Name */}
      <div className="mt-2">
        <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
        {annotations.length > 0 && (
          <p className="text-xs text-gray-500">
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Annotation Summary */}
      {annotations.length > 0 && showAnnotations && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 space-y-1"
        >
          {annotations.slice(0, 3).map((annotation, index) => (
            <div
              key={annotation.id}
              className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: annotation.color }}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 truncate">
                  {annotation.content || `${annotation.type} annotation`}
                </p>
                <p className="text-gray-500">by {annotation.createdBy.name}</p>
              </div>
            </div>
          ))}

          {annotations.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-6"
              onClick={onOpenFullAnnotationTool}
            >
              View all {annotations.length} annotations
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default InlineAnnotationViewer;