/**
 * Design Board Page - FluxStudio
 *
 * 2D collaborative canvas for placing and editing nodes (text, shapes, assets).
 * Supports real-time collaboration via Socket.IO.
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/templates';
import { Button, Card } from '@/components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  designBoardsSocketService,
  BoardNode,
  Board,
  BoardUser,
} from '../services/designBoardsSocketService';
import {
  ArrowLeft,
  Plus,
  Type,
  Square,
  Image,
  Trash2,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCw,
  Layers,
  Users,
  Save,
  MoreHorizontal,
} from 'lucide-react';

// Node type configurations
const NODE_TYPES = {
  text: { label: 'Text', icon: Type, defaultWidth: 200, defaultHeight: 100 },
  shape: { label: 'Shape', icon: Square, defaultWidth: 100, defaultHeight: 100 },
  asset: { label: 'Asset', icon: Image, defaultWidth: 200, defaultHeight: 200 },
};

// Shape types for shape nodes
const SHAPE_TYPES = ['rectangle', 'circle', 'triangle', 'diamond'];

// Colors for collaborator cursors
const CURSOR_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'
];

function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// Node component
function BoardNodeComponent({
  node,
  isSelected,
  isLockedByOther,
  onSelect,
  onUpdate,
  onDelete,
  scale,
}: {
  node: BoardNode;
  isSelected: boolean;
  isLockedByOther: boolean;
  onSelect: (nodeId: string) => void;
  onUpdate: (nodeId: string, patch: Partial<BoardNode>) => void;
  onDelete: (nodeId: string) => void;
  scale: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (node.locked || isLockedByOther) return;
    e.stopPropagation();
    onSelect(node.id);

    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !nodeRef.current) return;

    const canvas = nodeRef.current.parentElement;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const newX = (e.clientX - canvasRect.left - dragOffset.x) / scale;
    const newY = (e.clientY - canvasRect.top - dragOffset.y) / scale;

    onUpdate(node.id, { x: Math.max(0, newX), y: Math.max(0, newY) });
  }, [isDragging, node.id, dragOffset, scale, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = () => {
    if (node.type === 'text' && !node.locked && !isLockedByOther) {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(node.id, { data: { ...node.data, content: e.target.value } });
  };

  const handleTextBlur = () => {
    setIsEditing(false);
  };

  const renderNodeContent = () => {
    switch (node.type) {
      case 'text':
        return isEditing ? (
          <textarea
            className="w-full h-full p-2 bg-transparent resize-none focus:outline-none"
            value={(node.data.content as string) || ''}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            autoFocus
          />
        ) : (
          <div className="p-2 overflow-hidden">
            {(node.data.content as string) || 'Double-click to edit'}
          </div>
        );
      case 'shape':
        const shapeType = (node.data.shapeType as string) || 'rectangle';
        const fillColor = (node.data.fillColor as string) || '#3B82F6';
        const strokeColor = (node.data.strokeColor as string) || '#1D4ED8';

        if (shapeType === 'circle') {
          return (
            <div
              className="w-full h-full rounded-full"
              style={{ backgroundColor: fillColor, border: `2px solid ${strokeColor}` }}
            />
          );
        }
        if (shapeType === 'triangle') {
          return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon
                points="50,5 95,95 5,95"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
              />
            </svg>
          );
        }
        if (shapeType === 'diamond') {
          return (
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon
                points="50,5 95,50 50,95 5,50"
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth="2"
              />
            </svg>
          );
        }
        return (
          <div
            className="w-full h-full rounded"
            style={{ backgroundColor: fillColor, border: `2px solid ${strokeColor}` }}
          />
        );
      case 'asset':
        const assetUrl = node.data.previewUrl as string;
        return assetUrl ? (
          <img
            src={assetUrl}
            alt="Asset"
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <Image className="w-8 h-8" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute cursor-move select-none ${
        isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      } ${node.locked || isLockedByOther ? 'opacity-75' : ''}`}
      style={{
        left: node.x * scale,
        top: node.y * scale,
        width: (node.width || 100) * scale,
        height: (node.height || 100) * scale,
        zIndex: node.zIndex,
        transform: `rotate(${node.rotation}deg)`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-full h-full bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        {renderNodeContent()}
      </div>

      {/* Selection handles */}
      {isSelected && !node.locked && !isLockedByOther && (
        <>
          {/* Resize handles at corners */}
          <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-primary-500 rounded-sm cursor-se-resize" />
          <div className="absolute -left-1 -bottom-1 w-3 h-3 bg-primary-500 rounded-sm cursor-sw-resize" />
          <div className="absolute -right-1 -top-1 w-3 h-3 bg-primary-500 rounded-sm cursor-ne-resize" />
          <div className="absolute -left-1 -top-1 w-3 h-3 bg-primary-500 rounded-sm cursor-nw-resize" />
        </>
      )}

      {/* Lock indicator */}
      {(node.locked || isLockedByOther) && (
        <div className="absolute -top-6 left-0 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded">
          <Lock className="w-3 h-3 inline" /> {isLockedByOther ? 'In use' : 'Locked'}
        </div>
      )}
    </div>
  );
}

// Collaborator cursor component
function CollaboratorCursor({ user }: { user: BoardUser }) {
  if (!user.cursor) return null;

  const color = getCursorColor(user.userId);

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-75"
      style={{ left: user.cursor.x, top: user.cursor.y }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={color}
        className="drop-shadow-md"
      >
        <path d="M5.5 3.21V20.8l6.16-6.16h6.96L5.5 3.21z" />
      </svg>
      <span
        className="absolute left-5 top-4 text-xs px-1.5 py-0.5 rounded text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {user.userEmail.split('@')[0]}
      </span>
    </div>
  );
}

// Main page component
export default function DesignBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();

  const [board, setBoard] = useState<Board | null>(null);
  const [nodes, setNodes] = useState<BoardNode[]>([]);
  const [collaborators, setCollaborators] = useState<BoardUser[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lockedNodesByOthers, setLockedNodesByOthers] = useState<Map<string, string>>(new Map());
  const [scale, setScale] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Auth guard
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Connect to socket and join board
  useEffect(() => {
    if (!boardId || !user) return;

    designBoardsSocketService.connect();

    const unsubConnect = designBoardsSocketService.on('connect', () => {
      setIsConnected(true);
      designBoardsSocketService.joinBoard(boardId);
    });

    const unsubDisconnect = designBoardsSocketService.on('disconnect', () => {
      setIsConnected(false);
    });

    const unsubJoined = designBoardsSocketService.on('board:joined', (data: unknown) => {
      const { board: boardData, nodes: nodesData, users } = data as {
        board: Board;
        nodes: BoardNode[];
        users: BoardUser[];
      };
      setBoard(boardData);
      setNodes(nodesData);
      setCollaborators(users.filter(u => u.userId !== user.id));
      setIsLoading(false);
    });

    const unsubUserJoined = designBoardsSocketService.on('board:user-joined', (data: unknown) => {
      const { userId, userEmail } = data as { userId: string; userEmail: string };
      if (userId !== user.id) {
        setCollaborators(prev => [...prev, { userId, userEmail }]);
        showNotification(`${userEmail.split('@')[0]} joined the board`, 'info');
      }
    });

    const unsubUserLeft = designBoardsSocketService.on('board:user-left', (data: unknown) => {
      const { userId } = data as { userId: string };
      setCollaborators(prev => prev.filter(u => u.userId !== userId));
      setLockedNodesByOthers(prev => {
        const next = new Map(prev);
        for (const [nodeId, lockUserId] of prev) {
          if (lockUserId === userId) next.delete(nodeId);
        }
        return next;
      });
    });

    const unsubCursorMoved = designBoardsSocketService.on('cursor:moved', (data: unknown) => {
      const { userId, userEmail, x, y } = data as { userId: string; userEmail: string; x: number; y: number };
      if (userId !== user.id) {
        setCollaborators(prev =>
          prev.map(u => u.userId === userId ? { ...u, cursor: { x, y } } : u)
        );
      }
    });

    const unsubNodeCreated = designBoardsSocketService.on('node:created', (data: unknown) => {
      const { node } = data as { node: BoardNode };
      setNodes(prev => [...prev, node]);
    });

    const unsubNodeUpdated = designBoardsSocketService.on('node:updated', (data: unknown) => {
      const { node } = data as { node: BoardNode };
      setNodes(prev => prev.map(n => n.id === node.id ? node : n));
    });

    const unsubNodeDeleted = designBoardsSocketService.on('node:deleted', (data: unknown) => {
      const { nodeId } = data as { nodeId: string };
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    });

    const unsubNodeSelected = designBoardsSocketService.on('node:selected', (data: unknown) => {
      const { nodeId, userId } = data as { nodeId: string; userId: string };
      if (userId !== user.id) {
        setLockedNodesByOthers(prev => new Map(prev).set(nodeId, userId));
      }
    });

    const unsubNodeDeselected = designBoardsSocketService.on('node:deselected', (data: unknown) => {
      const { nodeId, userId } = data as { nodeId: string; userId: string };
      if (userId !== user.id) {
        setLockedNodesByOthers(prev => {
          const next = new Map(prev);
          next.delete(nodeId);
          return next;
        });
      }
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubJoined();
      unsubUserJoined();
      unsubUserLeft();
      unsubCursorMoved();
      unsubNodeCreated();
      unsubNodeUpdated();
      unsubNodeDeleted();
      unsubNodeSelected();
      unsubNodeDeselected();
      if (boardId) designBoardsSocketService.leaveBoard(boardId);
    };
  }, [boardId, user, showNotification]);

  // Fetch board via REST if socket not connected
  useEffect(() => {
    if (!boardId || !user) return;

    const fetchBoard = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/boards/${boardId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setBoard(data.board);
            setNodes(data.nodes);
            setIsLoading(false);
          }
        } else {
          showNotification('Failed to load board', 'error');
          navigate(-1);
        }
      } catch (error) {
        console.error('Error fetching board:', error);
        showNotification('Error loading board', 'error');
      }
    };

    // Only fetch via REST if socket hasn't loaded the board yet
    const timeout = setTimeout(() => {
      if (isLoading) fetchBoard();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [boardId, user, isLoading, navigate, showNotification]);

  // Handle canvas mouse move for cursor tracking
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!boardId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Throttle cursor updates
    designBoardsSocketService.moveCursor(boardId, x, y);
  }, [boardId, scale]);

  // Handle canvas click to deselect
  const handleCanvasClick = () => {
    if (selectedNodeId && boardId) {
      designBoardsSocketService.deselectNode(boardId, selectedNodeId);
    }
    setSelectedNodeId(null);
  };

  // Handle node selection
  const handleSelectNode = useCallback((nodeId: string) => {
    if (selectedNodeId && boardId) {
      designBoardsSocketService.deselectNode(boardId, selectedNodeId);
    }
    setSelectedNodeId(nodeId);
    if (boardId) {
      designBoardsSocketService.selectNode(boardId, nodeId);
    }
  }, [selectedNodeId, boardId]);

  // Handle node update
  const handleUpdateNode = useCallback((nodeId: string, patch: Partial<BoardNode>) => {
    if (!boardId) return;

    // Optimistic update
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...patch } : n));

    // Send to server
    designBoardsSocketService.updateNode(boardId, nodeId, patch);
  }, [boardId]);

  // Handle node delete
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!boardId) return;

    setNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);

    designBoardsSocketService.deleteNode(boardId, nodeId);
  }, [boardId, selectedNodeId]);

  // Add new node
  const handleAddNode = (type: 'text' | 'shape' | 'asset') => {
    if (!boardId) return;

    const config = NODE_TYPES[type];
    const maxZIndex = nodes.length > 0 ? Math.max(...nodes.map(n => n.zIndex)) : 0;

    const newNode: Partial<BoardNode> = {
      type,
      x: 100,
      y: 100,
      width: config.defaultWidth,
      height: config.defaultHeight,
      zIndex: maxZIndex + 1,
      rotation: 0,
      locked: false,
      data: type === 'text'
        ? { content: 'New text' }
        : type === 'shape'
        ? { shapeType: 'rectangle', fillColor: '#3B82F6', strokeColor: '#1D4ED8' }
        : {},
    };

    designBoardsSocketService.createNode(boardId, newNode);
  };

  // Toggle node lock
  const handleToggleLock = () => {
    if (!selectedNodeId || !boardId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      handleUpdateNode(selectedNodeId, { locked: !node.locked });
    }
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setScale(1);

  // Back navigation
  const handleBack = () => {
    if (board?.projectId) {
      navigate(`/projects/${board.projectId}`);
    } else {
      navigate(-1);
    }
  };

  if (!user) return null;

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: board?.name || 'Board' },
      ]}
      onLogout={logout}
    >
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <div className="h-6 w-px bg-gray-200" />

            <span className="font-medium text-gray-900">{board?.name || 'Loading...'}</span>

            {!isConnected && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Offline
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Collaborators */}
            {collaborators.length > 0 && (
              <div className="flex items-center gap-1 mr-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{collaborators.length}</span>
              </div>
            )}

            {/* Add node buttons */}
            <Button variant="outline" size="sm" onClick={() => handleAddNode('text')}>
              <Type className="w-4 h-4 mr-1" />
              Text
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddNode('shape')}>
              <Square className="w-4 h-4 mr-1" />
              Shape
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddNode('asset')}>
              <Image className="w-4 h-4 mr-1" />
              Asset
            </Button>

            <div className="h-6 w-px bg-gray-200 mx-1" />

            {/* Zoom controls */}
            <Button variant="ghost" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 bg-gray-50 overflow-auto relative"
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : (
              <div
                className="relative min-w-[2000px] min-h-[2000px]"
                style={{
                  backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                  backgroundSize: `${20 * scale}px ${20 * scale}px`,
                }}
              >
                {/* Nodes */}
                {nodes.map(node => (
                  <BoardNodeComponent
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    isLockedByOther={lockedNodesByOthers.has(node.id)}
                    onSelect={handleSelectNode}
                    onUpdate={handleUpdateNode}
                    onDelete={handleDeleteNode}
                    scale={scale}
                  />
                ))}

                {/* Collaborator cursors */}
                {collaborators.map(user => (
                  <CollaboratorCursor key={user.userId} user={user} />
                ))}
              </div>
            )}
          </div>

          {/* Properties panel */}
          {selectedNode && (
            <div className="w-64 border-l bg-white p-4">
              <h3 className="font-medium text-gray-900 mb-4">Properties</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Type</label>
                  <p className="text-sm font-medium capitalize">{selectedNode.type}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedNode.x)}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { x: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedNode.y)}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { y: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Width</label>
                    <input
                      type="number"
                      value={Math.round(selectedNode.width || 100)}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { width: parseInt(e.target.value) || 100 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Height</label>
                    <input
                      type="number"
                      value={Math.round(selectedNode.height || 100)}
                      onChange={(e) => handleUpdateNode(selectedNode.id, { height: parseInt(e.target.value) || 100 })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase">Rotation</label>
                  <input
                    type="number"
                    value={selectedNode.rotation}
                    onChange={(e) => handleUpdateNode(selectedNode.id, { rotation: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase">Layer</label>
                  <input
                    type="number"
                    value={selectedNode.zIndex}
                    onChange={(e) => handleUpdateNode(selectedNode.id, { zIndex: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>

                {selectedNode.type === 'shape' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Shape</label>
                      <select
                        value={(selectedNode.data.shapeType as string) || 'rectangle'}
                        onChange={(e) => handleUpdateNode(selectedNode.id, {
                          data: { ...selectedNode.data, shapeType: e.target.value }
                        })}
                        className="w-full px-2 py-1 text-sm border rounded"
                      >
                        {SHAPE_TYPES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase">Fill Color</label>
                      <input
                        type="color"
                        value={(selectedNode.data.fillColor as string) || '#3B82F6'}
                        onChange={(e) => handleUpdateNode(selectedNode.id, {
                          data: { ...selectedNode.data, fillColor: e.target.value }
                        })}
                        className="w-full h-8 border rounded cursor-pointer"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleLock}
                    className="flex-1"
                  >
                    {selectedNode.locked ? (
                      <>
                        <Unlock className="w-4 h-4 mr-1" />
                        Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-1" />
                        Lock
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
