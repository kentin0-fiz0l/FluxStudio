/**
 * CollaborativeAnnotationTool Component
 * Real-time collaborative image annotation with live updates
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Square, Circle, ArrowRight, Type, Palette, Save, Trash2, Users, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ImageAnnotation, MessageUser } from '../../types/messaging';
import { realtimeCollaborationService } from '../../services/realtimeCollaborationService';
import { cn } from '../../lib/utils';

interface CollaborativeAnnotationToolProps {
  imageUrl: string;
  annotations?: ImageAnnotation[];
  currentUser: MessageUser;
  conversationId: string;
  onAnnotationsChange: (annotations: ImageAnnotation[]) => void;
  readOnly?: boolean;
  className?: string;
}

type AnnotationType = 'point' | 'rectangle' | 'circle' | 'arrow' | 'text';

interface LiveAnnotation extends Partial<ImageAnnotation> {
  userId: string;
  isTemporary?: boolean;
  color?: string;
}

const annotationTools = [
  { type: 'point' as AnnotationType, icon: Pencil, label: 'Point' },
  { type: 'rectangle' as AnnotationType, icon: Square, label: 'Rectangle' },
  { type: 'circle' as AnnotationType, icon: Circle, label: 'Circle' },
  { type: 'arrow' as AnnotationType, icon: ArrowRight, label: 'Arrow' },
  { type: 'text' as AnnotationType, icon: Type, label: 'Text' },
];

const defaultColors = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#800000', '#000080', '#808000'
];

export function CollaborativeAnnotationTool({
  imageUrl,
  annotations = [],
  currentUser,
  conversationId,
  onAnnotationsChange,
  readOnly = false,
  className
}: CollaborativeAnnotationToolProps) {
  const [selectedTool, setSelectedTool] = useState<AnnotationType>('point');
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<ImageAnnotation> | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState('');
  const [liveAnnotations, setLiveAnnotations] = useState<Map<string, LiveAnnotation>>(new Map());
  const [collaborators, setCollaborators] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real-time collaboration setup
  useEffect(() => {
    const handleAnnotationEvent = (event: any) => {
      if (event.conversationId !== conversationId) return;

      switch (event.type) {
        case 'annotation_add':
          if (event.userId !== currentUser.id) {
            onAnnotationsChange([...annotations, event.data]);
          }
          break;

        case 'annotation_update':
          if (event.userId !== currentUser.id) {
            const updatedAnnotations = annotations.map(ann =>
              ann.id === event.data.id ? event.data : ann
            );
            onAnnotationsChange(updatedAnnotations);
          }
          break;

        case 'annotation_delete':
          if (event.userId !== currentUser.id) {
            const filteredAnnotations = annotations.filter(ann => ann.id !== event.data.id);
            onAnnotationsChange(filteredAnnotations);
          }
          break;

        case 'annotation_preview':
          // Show live annotation preview from other users
          if (event.userId !== currentUser.id) {
            setLiveAnnotations(prev => {
              const newMap = new Map(prev);
              newMap.set(event.userId, {
                ...event.data,
                userId: event.userId,
                isTemporary: true
              });
              return newMap;
            });

            // Clear preview after 2 seconds
            setTimeout(() => {
              setLiveAnnotations(prev => {
                const newMap = new Map(prev);
                newMap.delete(event.userId);
                return newMap;
              });
            }, 2000);
          }
          break;
      }
    };

    const handleUserJoined = (user: any) => {
      setCollaborators(prev => new Set([...prev, user.id]));
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      setCollaborators(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setLiveAnnotations(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    };

    realtimeCollaborationService.on('annotation_event', handleAnnotationEvent);
    realtimeCollaborationService.on('user_joined', handleUserJoined);
    realtimeCollaborationService.on('user_left', handleUserLeft);

    return () => {
      realtimeCollaborationService.off('annotation_event', handleAnnotationEvent);
      realtimeCollaborationService.off('user_joined', handleUserJoined);
      realtimeCollaborationService.off('user_left', handleUserLeft);
    };
  }, [conversationId, currentUser.id, annotations, onAnnotationsChange]);

  // Load and display image
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.onload = () => {
        redrawCanvas();
      };
      imageRef.current.src = imageUrl;
    }
  }, [imageUrl]);

  // Redraw canvas when annotations change
  useEffect(() => {
    redrawCanvas();
  }, [annotations, liveAnnotations]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw permanent annotations
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation);
    });

    // Draw live annotations from other users
    liveAnnotations.forEach(annotation => {
      if (annotation.isTemporary) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        drawAnnotation(ctx, annotation as ImageAnnotation);
        ctx.restore();
      }
    });

    // Draw current annotation if drawing
    if (currentAnnotation && isDrawing) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      drawAnnotation(ctx, currentAnnotation as ImageAnnotation);
      ctx.restore();
    }
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: ImageAnnotation | Partial<ImageAnnotation>) => {
    if (!annotation.x || !annotation.y || !annotation.color) return;

    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = 2;

    switch (annotation.type) {
      case 'point':
        ctx.beginPath();
        ctx.arc(annotation.x, annotation.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case 'rectangle':
        if (annotation.width && annotation.height) {
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
        }
        break;

      case 'circle':
        if (annotation.width) {
          const radius = annotation.width / 2;
          ctx.beginPath();
          ctx.arc(annotation.x + radius, annotation.y + radius, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case 'arrow':
        if (annotation.width && annotation.height) {
          const endX = annotation.x + annotation.width;
          const endY = annotation.y + annotation.height;

          // Draw line
          ctx.beginPath();
          ctx.moveTo(annotation.x, annotation.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(annotation.height, annotation.width);
          const arrowLength = 15;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
        break;

      case 'text':
        if (annotation.content) {
          ctx.font = '16px Arial';
          ctx.fillText(annotation.content, annotation.x, annotation.y);
        }
        break;
    }

    // Draw annotation number if it has an ID
    if (annotation.id) {
      const annotationIndex = annotations.findIndex(a => a.id === annotation.id);
      if (annotationIndex !== -1) {
        ctx.fillStyle = annotation.color;
        ctx.font = 'bold 12px Arial';
        ctx.fillText((annotationIndex + 1).toString(), annotation.x - 10, annotation.y - 10);
      }
    }
  };

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const position = getMousePosition(e);
    setIsDrawing(true);

    const newAnnotation: Partial<ImageAnnotation> = {
      id: `temp-${Date.now()}`,
      x: position.x,
      y: position.y,
      type: selectedTool,
      color: selectedColor,
      content: '',
      createdBy: currentUser,
      createdAt: new Date(),
    };

    if (selectedTool === 'point') {
      // For points, show comment dialog immediately
      setCommentPosition(position);
      setCommentText('');
      setShowCommentDialog(true);
      setCurrentAnnotation(newAnnotation);
    } else if (selectedTool === 'text') {
      // For text, show input dialog
      const text = prompt('Enter text:');
      if (text) {
        newAnnotation.content = text;
        const finalAnnotation = {
          ...newAnnotation,
          id: `annotation-${Date.now()}`
        } as ImageAnnotation;

        onAnnotationsChange([...annotations, finalAnnotation]);
        realtimeCollaborationService.sendAnnotationEvent('add', conversationId, finalAnnotation);
      }
      setIsDrawing(false);
    } else {
      setCurrentAnnotation(newAnnotation);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation || readOnly) return;

    const position = getMousePosition(e);

    if (selectedTool !== 'point' && selectedTool !== 'text') {
      const updatedAnnotation = {
        ...currentAnnotation,
        width: position.x - currentAnnotation.x!,
        height: position.y - currentAnnotation.y!,
      };
      setCurrentAnnotation(updatedAnnotation);

      // Send live preview to other users
      realtimeCollaborationService.sendAnnotationEvent('preview', conversationId, updatedAnnotation);
      redrawCanvas();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || readOnly) return;

    if (currentAnnotation && selectedTool !== 'point' && selectedTool !== 'text') {
      if (currentAnnotation.width && currentAnnotation.height) {
        setCommentPosition({ x: currentAnnotation.x!, y: currentAnnotation.y! });
        setCommentText('');
        setShowCommentDialog(true);
      }
    }
    setIsDrawing(false);
  };

  const handleSaveComment = () => {
    if (!currentAnnotation) return;

    const finalAnnotation: ImageAnnotation = {
      ...currentAnnotation,
      id: `annotation-${Date.now()}`,
      content: commentText,
    } as ImageAnnotation;

    onAnnotationsChange([...annotations, finalAnnotation]);
    realtimeCollaborationService.sendAnnotationEvent('add', conversationId, finalAnnotation);

    setShowCommentDialog(false);
    setCurrentAnnotation(null);
    setCommentText('');
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    const filteredAnnotations = annotations.filter(a => a.id !== annotationId);
    onAnnotationsChange(filteredAnnotations);
    realtimeCollaborationService.sendAnnotationEvent('delete', conversationId, { id: annotationId });
    setSelectedAnnotation(null);
  };

  const handleAnnotationClick = (annotation: ImageAnnotation) => {
    setSelectedAnnotation(annotation.id);
  };

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col", className)}>
        {/* Toolbar */}
        {!readOnly && (
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            {/* Tools */}
            <div className="flex gap-2">
              {annotationTools.map(tool => (
                <Tooltip key={tool.type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedTool === tool.type ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTool(tool.type)}
                    >
                      <tool.icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Color Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: selectedColor }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-6 gap-1">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Collaborators indicator */}
            {collaborators.size > 0 && (
              <div className="flex items-center gap-2">
                <Users size={14} className="text-blue-600" />
                <Badge variant="outline" className="text-xs">
                  {collaborators.size + 1} active
                </Badge>
              </div>
            )}

            {/* Instructions */}
            <div className="text-sm text-muted-foreground">
              Select a tool and click on the image to add annotations
            </div>
          </div>
        )}

        {/* Image and Canvas Container */}
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div ref={containerRef} className="flex-1 relative overflow-auto bg-gray-50">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Annotatable content"
              className="block max-w-full h-auto"
              style={{ display: 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 cursor-crosshair max-w-full h-auto"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'top left',
              }}
            />
          </div>

          {/* Annotations Sidebar */}
          <div className="w-80 border-l bg-background">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                Annotations
                <Badge variant="secondary">{annotations.length}</Badge>
                {collaborators.size > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Eye size={12} className="text-blue-600" />
                        <span className="text-xs text-blue-600">{collaborators.size}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {collaborators.size} other{collaborators.size !== 1 ? 's' : ''} viewing
                    </TooltipContent>
                  </Tooltip>
                )}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {annotations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pencil className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No annotations yet</p>
                  <p className="text-sm">Click on the image to add feedback</p>
                </div>
              ) : (
                annotations.map((annotation, index) => (
                  <motion.div
                    key={annotation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors",
                      selectedAnnotation === annotation.id ? "border-primary bg-accent" : "hover:bg-accent"
                    )}
                    onClick={() => handleAnnotationClick(annotation)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                          style={{ backgroundColor: annotation.color }}
                        >
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium capitalize">
                          {annotation.type}
                        </span>
                      </div>

                      {!readOnly && selectedAnnotation === annotation.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnnotation(annotation.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {annotation.content && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {annotation.content}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="w-4 h-4">
                        <AvatarImage src={annotation.createdBy.avatar} />
                        <AvatarFallback className="text-xs">
                          {annotation.createdBy.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{annotation.createdBy.name}</span>
                      <span>•</span>
                      <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
                      {annotation.createdBy.id !== currentUser.id && (
                        <Badge variant="outline" className="text-xs">
                          Remote
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Comment Dialog */}
        {showCommentDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background border rounded-lg p-4 w-80"
            >
              <h3 className="font-semibold mb-3">Add Comment</h3>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Describe your feedback..."
                rows={3}
                className="mb-3"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCommentDialog(false);
                    setCurrentAnnotation(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveComment} disabled={!commentText.trim()}>
                  Save
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default CollaborativeAnnotationTool;