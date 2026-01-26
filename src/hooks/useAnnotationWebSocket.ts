/**
 * useAnnotationWebSocket Hook
 * Manages WebSocket connection for real-time annotation collaboration
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ImageAnnotation, MessageUser } from '../types/messaging';

interface CollaboratorCursor {
  userId: string;
  user: MessageUser;
  position: { x: number; y: number };
  lastSeen: Date;
  isActive: boolean;
}

interface UseAnnotationWebSocketOptions {
  conversationId?: string;
  currentUser: MessageUser;
  readOnly?: boolean;
  onAnnotationCreate?: (annotation: ImageAnnotation) => void;
  onAnnotationUpdate?: (annotation: ImageAnnotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onUserJoined?: (user: MessageUser) => void;
  onUserLeft?: (userId: string) => void;
}

interface UseAnnotationWebSocketReturn {
  isConnected: boolean;
  collaboratorCursors: CollaboratorCursor[];
  sendCursorPosition: (position: { x: number; y: number }) => void;
  broadcastAnnotation: (action: 'create' | 'update' | 'delete', annotation: ImageAnnotation) => void;
}

export function useAnnotationWebSocket({
  conversationId,
  currentUser,
  readOnly = false,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onUserJoined,
  onUserLeft
}: UseAnnotationWebSocketOptions): UseAnnotationWebSocketReturn {
  const [isConnected, setIsConnected] = useState(true);
  const [collaboratorCursors, setCollaboratorCursors] = useState<CollaboratorCursor[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);

  const updateCollaboratorCursor = useCallback((userId: string, user: MessageUser, position: { x: number; y: number }) => {
    setCollaboratorCursors(prev => {
      const existing = prev.find(c => c.userId === userId);
      if (existing) {
        return prev.map(c =>
          c.userId === userId
            ? { ...c, position, lastSeen: new Date(), isActive: true }
            : c
        );
      }
      return [...prev, {
        userId,
        user,
        position,
        lastSeen: new Date(),
        isActive: true
      }];
    });
  }, []);

  const removeCollaborator = useCallback((userId: string) => {
    setCollaboratorCursors(prev => prev.filter(c => c.userId !== userId));
  }, []);

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
          onAnnotationCreate?.(data.annotation);
          break;
        case 'annotation_update':
          onAnnotationUpdate?.(data.annotation);
          break;
        case 'annotation_delete':
          onAnnotationDelete?.(data.annotationId);
          break;
        case 'user_joined':
          onUserJoined?.(data.user);
          break;
        case 'user_left':
          removeCollaborator(data.userId);
          onUserLeft?.(data.userId);
          break;
      }
    };

    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    return () => {
      ws.close();
      websocketRef.current = null;
    };
  }, [conversationId, currentUser.id, readOnly, onAnnotationCreate, onAnnotationUpdate, onAnnotationDelete, onUserJoined, onUserLeft, updateCollaboratorCursor, removeCollaborator]);

  const sendCursorPosition = useCallback((position: { x: number; y: number }) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'cursor_move',
        userId: currentUser.id,
        user: currentUser,
        position
      }));
    }
  }, [currentUser]);

  const broadcastAnnotation = useCallback((action: 'create' | 'update' | 'delete', annotation: ImageAnnotation) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: `annotation_${action}`,
        annotation,
        userId: currentUser.id
      }));
    }
  }, [currentUser.id]);

  return {
    isConnected,
    collaboratorCursors,
    sendCursorPosition,
    broadcastAnnotation
  };
}

export type { CollaboratorCursor };
