/**
 * RealtimeImageAnnotation Component
 * Enhanced image annotation with real-time collaboration capabilities
 *
 * Refactored to use extracted components from ./annotation/
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ImageAnnotation, MessageUser } from '../../types/messaging';
import { cn } from '../../lib/utils';
import {
  AnnotationToolbar,
  AnnotationsList,
  LayersPanel,
  CommentDialog,
  AnnotationType,
  defaultColors,
  AnnotationLayer
} from './annotation';

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

// Types imported from ./annotation
interface CollaboratorCursor {
  userId: string;
  user: MessageUser;
  position: { x: number; y: number };
  lastSeen: Date;
  isActive: boolean;
}

interface AnnotationHistory {
  id: string;
  action: 'create' | 'update' | 'delete';
  annotation: ImageAnnotation;
  timestamp: Date;
  userId: string;
}

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
      {/* Toolbar - Extracted Component */}
      {!readOnly && (
        <AnnotationToolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          zoom={zoom}
          onZoomChange={setZoom}
          onResetView={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          canUndo={historyIndex >= 0}
          canRedo={historyIndex < annotationHistory.length - 1}
          onUndo={undo}
          onRedo={redo}
          isConnected={isConnected}
          collaborators={collaborators}
          showCollaborators={showCollaborators}
          onToggleCollaborators={() => setShowCollaborators(!showCollaborators)}
          showLayers={showLayers}
          onToggleLayers={() => setShowLayers(!showLayers)}
        />
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

        {/* Layers Panel - Extracted Component */}
        <LayersPanel
          isOpen={showLayers}
          layers={layers}
          activeLayer={activeLayer}
          onLayerSelect={setActiveLayer}
          onCreateLayer={createNewLayer}
          onToggleVisibility={toggleLayerVisibility}
        />

        {/* Annotations Sidebar - Extracted Component */}
        <AnnotationsList
          annotations={filteredAnnotations}
          selectedAnnotation={selectedAnnotation}
          onAnnotationSelect={(annotation) => {
            setSelectedAnnotation(annotation.id);
            onAnnotationSelect?.(annotation);
          }}
          onAnnotationDelete={handleDeleteAnnotation}
          isConnected={isConnected}
          readOnly={readOnly}
        />
      </div>

      {/* Comment Dialog - Extracted Component */}
      <CommentDialog
        isOpen={showCommentDialog}
        commentText={commentText}
        onCommentChange={setCommentText}
        onSave={handleSaveComment}
        onCancel={() => {
          setShowCommentDialog(false);
          setCurrentAnnotation(null);
          setFreehandPath([]);
        }}
      />
    </div>
  );
}

export default RealtimeImageAnnotation;