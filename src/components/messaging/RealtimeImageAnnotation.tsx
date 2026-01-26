/**
 * RealtimeImageAnnotation Component
 * Enhanced image annotation with real-time collaboration capabilities
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Type,
  Save,
  Trash2,
  Users,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Clock,
  MessageCircle,
  Layers,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
// Input not currently used
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';
// Switch not currently used
import { Label } from '../ui/label';
import { ImageAnnotation, MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';

interface RealtimeImageAnnotationProps {
  imageUrl: string;
  annotations?: ImageAnnotation[];
  currentUser: MessageUser;
  onAnnotationsChange: (annotations: ImageAnnotation[]) => void;
  readOnly?: boolean;
  className?: string;
  conversationId?: string;
  fileVersionId?: string;
  collaborators?: MessageUser[];
  onCollaboratorCursorMove?: (userId: string, position: { x: number; y: number }) => void;
  onAnnotationSelect?: (annotation: ImageAnnotation) => void;
}

interface CollaboratorCursor {
  userId: string;
  user: MessageUser;
  position: { x: number; y: number };
  lastSeen: Date;
  isActive: boolean;
}

interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  annotations: string[];
  color: string;
}

interface AnnotationHistory {
  id: string;
  action: 'create' | 'update' | 'delete';
  annotation: ImageAnnotation;
  timestamp: Date;
  userId: string;
}

type AnnotationType = 'point' | 'rectangle' | 'circle' | 'arrow' | 'text' | 'freehand';

const annotationTools = [
  { type: 'point' as AnnotationType, icon: Pencil, label: 'Point' },
  { type: 'rectangle' as AnnotationType, icon: Square, label: 'Rectangle' },
  { type: 'circle' as AnnotationType, icon: Circle, label: 'Circle' },
  { type: 'arrow' as AnnotationType, icon: ArrowRight, label: 'Arrow' },
  { type: 'text' as AnnotationType, icon: Type, label: 'Text' },
  { type: 'freehand' as AnnotationType, icon: Pencil, label: 'Freehand' },
];

const defaultColors = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#800000', '#000080', '#808000',
  '#FF69B4', '#32CD32', '#1E90FF', '#FFD700', '#DC143C', '#00CED1'
];

export function RealtimeImageAnnotation({
  imageUrl,
  annotations = [],
  currentUser,
  onAnnotationsChange,
  readOnly = false,
  className,
  conversationId,
  fileVersionId: _fileVersionId,
  collaborators = [],
  onCollaboratorCursorMove,
  onAnnotationSelect
}: RealtimeImageAnnotationProps) {
  // Tool and drawing state
  const [selectedTool, setSelectedTool] = useState<AnnotationType>('point');
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<ImageAnnotation> | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);

  // UI state
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [_commentPosition, _setCommentPosition] = useState({ x: 0, y: 0 });
  const [commentText, setCommentText] = useState('');
  const [showCollaborators, setShowCollaborators] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Collaboration state
  const [collaboratorCursors, setCollaboratorCursors] = useState<CollaboratorCursor[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [layers, setLayers] = useState<AnnotationLayer[]>([
    {
      id: 'default',
      name: 'Main Layer',
      visible: true,
      locked: false,
      annotations: annotations.map(a => a.id),
      color: '#3B82F6'
    }
  ]);
  const [activeLayer, setActiveLayer] = useState('default');
  const [annotationHistory, setAnnotationHistory] = useState<AnnotationHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Drawing state for freehand
  const [freehandPath, setFreehandPath] = useState<Array<{ x: number; y: number }>>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time collaboration
  useEffect(() => {
    if (!conversationId || readOnly) return;

    const ws = new WebSocket(`ws://localhost:8080/annotation/${conversationId}`);
    websocketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({
        type: 'join',
        userId: currentUser.id,
        user: currentUser
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'cursor_move':
          updateCollaboratorCursor(data.userId, data.user, data.position);
          break;
        case 'annotation_create':
          handleRemoteAnnotationCreate(data.annotation);
          break;
        case 'annotation_update':
          handleRemoteAnnotationUpdate(data.annotation);
          break;
        case 'annotation_delete':
          handleRemoteAnnotationDelete(data.annotationId);
          break;
        case 'user_joined':
          addCollaborator(data.user);
          break;
        case 'user_left':
          removeCollaborator(data.userId);
          break;
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    return () => {
      ws.close();
      websocketRef.current = null;
    };
  }, [conversationId, currentUser.id]);

  // Load and display image
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.onload = () => {
        redrawCanvas();
      };
      imageRef.current.src = imageUrl;
    }
  }, [imageUrl]);

  // Redraw canvas when annotations, zoom, or pan changes
  useEffect(() => {
    redrawCanvas();
  }, [annotations, zoom, pan, layers, selectedAnnotation, freehandPath]);

  const updateCollaboratorCursor = (userId: string, user: MessageUser, position: { x: number; y: number }) => {
    setCollaboratorCursors(prev => {
      const existing = prev.find(c => c.userId === userId);
      if (existing) {
        return prev.map(c =>
          c.userId === userId
            ? { ...c, position, lastSeen: new Date(), isActive: true }
            : c
        );
      } else {
        return [...prev, {
          userId,
          user,
          position,
          lastSeen: new Date(),
          isActive: true
        }];
      }
    });
  };

  const handleRemoteAnnotationCreate = (annotation: ImageAnnotation) => {
    onAnnotationsChange([...annotations, annotation]);
    addToHistory('create', annotation);
  };

  const handleRemoteAnnotationUpdate = (updatedAnnotation: ImageAnnotation) => {
    const newAnnotations = annotations.map(a =>
      a.id === updatedAnnotation.id ? updatedAnnotation : a
    );
    onAnnotationsChange(newAnnotations);
    addToHistory('update', updatedAnnotation);
  };

  const handleRemoteAnnotationDelete = (annotationId: string) => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (annotation) {
      onAnnotationsChange(annotations.filter(a => a.id !== annotationId));
      addToHistory('delete', annotation);
    }
  };

  const addCollaborator = (_user: MessageUser) => {
    // Add collaborator logic if needed
  };

  const removeCollaborator = (userId: string) => {
    setCollaboratorCursors(prev => prev.filter(c => c.userId !== userId));
  };

  const addToHistory = (action: 'create' | 'update' | 'delete', annotation: ImageAnnotation) => {
    const historyEntry: AnnotationHistory = {
      id: `history-${Date.now()}`,
      action,
      annotation,
      timestamp: new Date(),
      userId: currentUser.id
    };

    setAnnotationHistory(prev => [...prev.slice(0, historyIndex + 1), historyEntry]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex >= 0) {
      const entry = annotationHistory[historyIndex];

      switch (entry.action) {
        case 'create':
          onAnnotationsChange(annotations.filter(a => a.id !== entry.annotation.id));
          break;
        case 'delete':
          onAnnotationsChange([...annotations, entry.annotation]);
          break;
        case 'update':
          // Would need previous state for proper undo
          break;
      }

      setHistoryIndex(prev => prev - 1);
    }
  };

  const redo = () => {
    if (historyIndex < annotationHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      const entry = annotationHistory[historyIndex + 1];

      switch (entry.action) {
        case 'create':
          onAnnotationsChange([...annotations, entry.annotation]);
          break;
        case 'delete':
          onAnnotationsChange(annotations.filter(a => a.id !== entry.annotation.id));
          break;
        case 'update':
          const updated = annotations.map(a =>
            a.id === entry.annotation.id ? entry.annotation : a
          );
          onAnnotationsChange(updated);
          break;
      }
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = image.naturalWidth * zoom;
    canvas.height = image.naturalHeight * zoom;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Draw annotations by layer
    layers.forEach(layer => {
      if (!layer.visible) return;

      const layerAnnotations = annotations.filter(a => layer.annotations.includes(a.id));
      layerAnnotations.forEach(annotation => {
        drawAnnotation(ctx, annotation, annotation.id === selectedAnnotation);
      });
    });

    // Draw current annotation if drawing
    if (currentAnnotation && isDrawing) {
      drawAnnotation(ctx, currentAnnotation as ImageAnnotation, true);
    }

    // Draw freehand path if drawing
    if (selectedTool === 'freehand' && freehandPath.length > 0) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      freehandPath.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    }

    ctx.restore();

    // Draw collaborator cursors (not affected by zoom/pan)
    if (showCollaborators) {
      collaboratorCursors
        .filter(cursor => cursor.isActive && cursor.userId !== currentUser.id)
        .forEach(cursor => {
          drawCollaboratorCursor(ctx, cursor);
        });
    }
  };

  const drawAnnotation = (
    ctx: CanvasRenderingContext2D,
    annotation: ImageAnnotation | Partial<ImageAnnotation>,
    isSelected: boolean = false
  ) => {
    if (!annotation.x || !annotation.y || !annotation.color) return;

    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = isSelected ? 3 : 2;

    // Add selection outline
    if (isSelected) {
      ctx.shadowColor = annotation.color;
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    switch (annotation.type) {
      case 'point':
        ctx.beginPath();
        ctx.arc(annotation.x, annotation.y, brushSize + (isSelected ? 2 : 0), 0, 2 * Math.PI);
        ctx.fill();
        break;

      case 'rectangle':
        if (annotation.width && annotation.height) {
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          if (isSelected) {
            ctx.fillStyle = annotation.color + '20';
            ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
          }
        }
        break;

      case 'circle':
        if (annotation.width) {
          const radius = annotation.width / 2;
          ctx.beginPath();
          ctx.arc(annotation.x + radius, annotation.y + radius, radius, 0, 2 * Math.PI);
          ctx.stroke();
          if (isSelected) {
            ctx.fillStyle = annotation.color + '20';
            ctx.fill();
          }
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
          const arrowLength = 15 * (brushSize / 3);
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
          ctx.font = `${16 + brushSize}px Arial`;
          ctx.fillText(annotation.content, annotation.x, annotation.y);
        }
        break;

      case 'freehand':
        if (annotation.path) {
          ctx.strokeStyle = annotation.color;
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          annotation.path.forEach((point: any, index: number) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        }
        break;
    }

    // Draw annotation number if it has an ID
    if (annotation.id) {
      const annotationIndex = annotations.findIndex(a => a.id === annotation.id);
      if (annotationIndex !== -1) {
        ctx.fillStyle = annotation.color;
        ctx.font = 'bold 12px Arial';
        ctx.fillText((annotationIndex + 1).toString(), annotation.x - 15, annotation.y - 10);
      }
    }
  };

  const drawCollaboratorCursor = (ctx: CanvasRenderingContext2D, cursor: CollaboratorCursor) => {
    const { position, user } = cursor;

    // Draw cursor
    ctx.fillStyle = user.color || '#3B82F6';
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(position.x + 12, position.y + 12);
    ctx.lineTo(position.x + 5, position.y + 12);
    ctx.lineTo(position.x, position.y + 17);
    ctx.fill();

    // Draw user name
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    const nameWidth = ctx.measureText(user.name).width;
    ctx.fillStyle = user.color || '#3B82F6';
    ctx.fillRect(position.x + 15, position.y - 5, nameWidth + 8, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(user.name, position.x + 19, position.y + 8);
  };

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = ((e.clientX - rect.left) * scaleX) / zoom - pan.x;
    const y = ((e.clientY - rect.top) * scaleY) / zoom - pan.y;

    // Send cursor position to collaborators
    if (websocketRef.current && onCollaboratorCursorMove) {
      websocketRef.current.send(JSON.stringify({
        type: 'cursor_move',
        userId: currentUser.id,
        user: currentUser,
        position: { x, y }
      }));
    }

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const position = getMousePosition(e);
    setIsDrawing(true);

    // Check if clicking on existing annotation first
    const clickedAnnotation = findAnnotationAtPosition(position);
    if (clickedAnnotation && e.shiftKey) {
      setSelectedAnnotation(clickedAnnotation.id);
      onAnnotationSelect?.(clickedAnnotation);
      return;
    }

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
      setCommentPosition(position);
      setCommentText('');
      setShowCommentDialog(true);
      setCurrentAnnotation(newAnnotation);
    } else if (selectedTool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        newAnnotation.content = text;
        const finalAnnotation = {
          ...newAnnotation,
          id: `annotation-${Date.now()}`,
        } as ImageAnnotation;

        onAnnotationsChange([...annotations, finalAnnotation]);
        broadcastAnnotation('create', finalAnnotation);
        addToHistory('create', finalAnnotation);
      }
      setIsDrawing(false);
    } else if (selectedTool === 'freehand') {
      setFreehandPath([position]);
      setCurrentAnnotation(newAnnotation);
    } else {
      setCurrentAnnotation(newAnnotation);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const position = getMousePosition(e);

    if (!isDrawing || !currentAnnotation || readOnly) return;

    if (selectedTool === 'freehand') {
      setFreehandPath(prev => [...prev, position]);
      redrawCanvas();
    } else if (selectedTool !== 'point' && selectedTool !== 'text') {
      const updatedAnnotation = {
        ...currentAnnotation,
        width: position.x - currentAnnotation.x!,
        height: position.y - currentAnnotation.y!,
      };
      setCurrentAnnotation(updatedAnnotation);
      redrawCanvas();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || readOnly) return;

    if (selectedTool === 'freehand' && currentAnnotation && freehandPath.length > 1) {
      const finalAnnotation: ImageAnnotation = {
        ...currentAnnotation,
        id: `annotation-${Date.now()}`,
        type: 'freehand',
        path: freehandPath,
        content: `Freehand drawing (${freehandPath.length} points)`
      } as ImageAnnotation;

      onAnnotationsChange([...annotations, finalAnnotation]);
      broadcastAnnotation('create', finalAnnotation);
      addToHistory('create', finalAnnotation);
      setFreehandPath([]);
    } else if (currentAnnotation && selectedTool !== 'point' && selectedTool !== 'text' && selectedTool !== 'freehand') {
      if (currentAnnotation.width && currentAnnotation.height) {
        setCommentPosition({ x: currentAnnotation.x!, y: currentAnnotation.y! });
        setCommentText('');
        setShowCommentDialog(true);
      }
    }

    setIsDrawing(false);
  };

  const findAnnotationAtPosition = (position: { x: number; y: number }): ImageAnnotation | null => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];

      switch (annotation.type) {
        case 'point':
          const distance = Math.sqrt(
            Math.pow(position.x - annotation.x, 2) + Math.pow(position.y - annotation.y, 2)
          );
          if (distance <= brushSize + 5) return annotation;
          break;

        case 'rectangle':
          if (annotation.width && annotation.height &&
              position.x >= annotation.x && position.x <= annotation.x + annotation.width &&
              position.y >= annotation.y && position.y <= annotation.y + annotation.height) {
            return annotation;
          }
          break;

        case 'circle':
          if (annotation.width) {
            const centerX = annotation.x + annotation.width / 2;
            const centerY = annotation.y + annotation.width / 2;
            const radius = annotation.width / 2;
            const dist = Math.sqrt(
              Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2)
            );
            if (dist <= radius) return annotation;
          }
          break;
      }
    }
    return null;
  };

  const broadcastAnnotation = (action: 'create' | 'update' | 'delete', annotation: ImageAnnotation) => {
    if (websocketRef.current) {
      websocketRef.current.send(JSON.stringify({
        type: `annotation_${action}`,
        annotation,
        userId: currentUser.id
      }));
    }
  };

  const handleSaveComment = () => {
    if (!currentAnnotation) return;

    const finalAnnotation: ImageAnnotation = {
      ...currentAnnotation,
      id: `annotation-${Date.now()}`,
      content: commentText,
      path: selectedTool === 'freehand' ? freehandPath : undefined
    } as ImageAnnotation;

    onAnnotationsChange([...annotations, finalAnnotation]);
    broadcastAnnotation('create', finalAnnotation);
    addToHistory('create', finalAnnotation);

    setShowCommentDialog(false);
    setCurrentAnnotation(null);
    setCommentText('');
    setFreehandPath([]);
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    const annotation = annotations.find(a => a.id === annotationId);
    if (annotation) {
      onAnnotationsChange(annotations.filter(a => a.id !== annotationId));
      broadcastAnnotation('delete', annotation);
      addToHistory('delete', annotation);
      setSelectedAnnotation(null);
    }
  };

  const createNewLayer = () => {
    const newLayer: AnnotationLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      annotations: [],
      color: defaultColors[layers.length % defaultColors.length]
    };
    setLayers(prev => [...prev, newLayer]);
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const filteredAnnotations = useMemo(() => {
    const activeLayerObj = layers.find(l => l.id === activeLayer);
    if (!activeLayerObj) return annotations;

    return annotations.filter(a => activeLayerObj.annotations.includes(a.id));
  }, [annotations, activeLayer, layers]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      {!readOnly && (
        <Card className="border-b rounded-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Tools */}
                <div className="flex gap-2">
                  {annotationTools.map(tool => (
                    <Button
                      key={tool.type}
                      variant={selectedTool === tool.type ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTool(tool.type)}
                      className="h-9"
                    >
                      <tool.icon className="w-4 h-4 mr-2" />
                      {tool.label}
                    </Button>
                  ))}
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Color and Brush Size */}
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-9 h-9 p-0">
                        <div
                          className="w-5 h-5 rounded border"
                          style={{ backgroundColor: selectedColor }}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <div className="grid grid-cols-6 gap-2">
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

                  <div className="flex items-center gap-2">
                    <Label htmlFor="brush-size" className="text-sm whitespace-nowrap">
                      Size:
                    </Label>
                    <Slider
                      id="brush-size"
                      min={1}
                      max={10}
                      step={1}
                      value={[brushSize]}
                      onValueChange={(value) => setBrushSize(value[0])}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500 w-6">{brushSize}</span>
                  </div>
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* History Controls */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undo}
                    disabled={historyIndex < 0}
                    className="h-9"
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={redo}
                    disabled={historyIndex >= annotationHistory.length - 1}
                    className="h-9"
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
                    className="h-9"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
                    className="h-9"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                    className="h-9"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-500">
                    {isConnected ? 'Connected' : 'Offline'}
                  </span>
                </div>

                {/* Collaborators */}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <div className="flex -space-x-2">
                    {collaborators.slice(0, 3).map(user => (
                      <Avatar key={user.id} className="w-6 h-6 border-2 border-white">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {collaborators.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">
                        +{collaborators.length - 3}
                      </div>
                    )}
                  </div>
                </div>

                {/* Toggle Controls */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCollaborators(!showCollaborators)}
                    className={cn("h-9", showCollaborators && "bg-blue-50")}
                  >
                    {showCollaborators ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLayers(!showLayers)}
                    className={cn("h-9", showLayers && "bg-blue-50")}
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
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
              backgroundSize: `${100 * zoom}%`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${pan.x * zoom}px ${pan.y * zoom}px`,
            }}
          />
        </div>

        {/* Layers Panel */}
        <AnimatePresence>
          {showLayers && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l bg-background overflow-hidden"
            >
              <Card className="h-full rounded-none border-0">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Layers</CardTitle>
                    <Button
                      size="sm"
                      onClick={createNewLayer}
                      className="h-7"
                    >
                      <Layers className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {layers.map(layer => (
                    <div
                      key={layer.id}
                      className={cn(
                        "p-2 border rounded cursor-pointer transition-colors",
                        activeLayer === layer.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      )}
                      onClick={() => setActiveLayer(layer.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: layer.color }}
                          />
                          <span className="text-sm font-medium">{layer.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                        >
                          {layer.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {layer.annotations.length} annotations
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Annotations Sidebar */}
        <div className="w-80 border-l bg-background">
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  Annotations
                  <Badge variant="secondary">{filteredAnnotations.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">Real-time</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {filteredAnnotations.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pencil className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No annotations yet</p>
                  <p className="text-sm">Click on the image to add feedback</p>
                </div>
              ) : (
                filteredAnnotations.map((annotation, index) => (
                  <motion.div
                    key={annotation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all",
                      selectedAnnotation === annotation.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => {
                      setSelectedAnnotation(annotation.id);
                      onAnnotationSelect?.(annotation);
                    }}
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
                        {annotation.type === 'freehand' && (
                          <Badge variant="outline" className="text-xs">
                            Drawing
                          </Badge>
                        )}
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
                    </div>

                    {/* Real-time indicators */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        {isConnected && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            <Wifi className="w-2 h-2 mr-1" />
                            Synced
                          </Badge>
                        )}
                      </div>

                      {annotation.id.startsWith('temp-') && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                          Saving...
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Comment Dialog */}
      <AnimatePresence>
        {showCommentDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border rounded-lg p-4 w-96 max-w-[90vw]"
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Add Comment
              </h3>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Describe your feedback..."
                rows={3}
                className="mb-3"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCommentDialog(false);
                    setCurrentAnnotation(null);
                    setFreehandPath([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveComment}
                  disabled={!commentText.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RealtimeImageAnnotation;