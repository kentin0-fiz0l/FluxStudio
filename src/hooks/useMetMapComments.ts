/**
 * useMetMapComments — Yjs-backed comment CRUD for canvas comments.
 *
 * Sprint 32: Comments are stored in a Y.Array<Y.Map> at doc.getArray('comments').
 * Separate from the 'sections' array so Y.UndoManager doesn't undo comments.
 */

import { useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';

export interface CanvasComment {
  id: string;
  userId: string;
  username: string;
  color: string;
  barStart: number;
  barEnd?: number;
  text: string;
  createdAt: number;
  resolved: boolean;
}

function commentToYMap(comment: CanvasComment): Y.Map<unknown> {
  const yMap = new Y.Map<unknown>();
  yMap.set('id', comment.id);
  yMap.set('userId', comment.userId);
  yMap.set('username', comment.username);
  yMap.set('color', comment.color);
  yMap.set('barStart', comment.barStart);
  yMap.set('barEnd', comment.barEnd ?? null);
  yMap.set('text', comment.text);
  yMap.set('createdAt', comment.createdAt);
  yMap.set('resolved', comment.resolved);
  return yMap;
}

function yMapToComment(yMap: Y.Map<unknown>): CanvasComment {
  const data = yMap.toJSON();
  return {
    id: data.id as string,
    userId: data.userId as string,
    username: data.username as string,
    color: data.color as string,
    barStart: (data.barStart as number) || 1,
    barEnd: (data.barEnd as number) || undefined,
    text: (data.text as string) || '',
    createdAt: (data.createdAt as number) || Date.now(),
    resolved: (data.resolved as boolean) || false,
  };
}

interface UseMetMapCommentsReturn {
  comments: CanvasComment[];
  addComment: (barStart: number, text: string, userId: string, username: string, color: string, barEnd?: number) => void;
  resolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
}

export function useMetMapComments(doc: Y.Doc | null): UseMetMapCommentsReturn {
  const [comments, setComments] = useState<CanvasComment[]>([]);

  useEffect(() => {
    if (!doc) {
      setComments([]);
      return;
    }

    const yComments: Y.Array<Y.Map<unknown>> = doc.getArray('comments');

    function readComments() {
      const result: CanvasComment[] = [];
      for (let i = 0; i < yComments.length; i++) {
        const yMap = yComments.get(i);
        if (yMap instanceof Y.Map) {
          result.push(yMapToComment(yMap));
        }
      }
      setComments(result);
    }

    yComments.observeDeep(readComments);
    readComments();

    return () => {
      yComments.unobserveDeep(readComments);
    };
  }, [doc]);

  const addComment = useCallback(
    (barStart: number, text: string, userId: string, username: string, color: string, barEnd?: number) => {
      if (!doc) return;
      const yComments: Y.Array<Y.Map<unknown>> = doc.getArray('comments');
      const comment: CanvasComment = {
        id: crypto.randomUUID(),
        userId,
        username,
        color,
        barStart,
        barEnd,
        text,
        createdAt: Date.now(),
        resolved: false,
      };
      doc.transact(() => {
        yComments.push([commentToYMap(comment)]);
      });
    },
    [doc]
  );

  const resolveComment = useCallback(
    (commentId: string) => {
      if (!doc) return;
      const yComments: Y.Array<Y.Map<unknown>> = doc.getArray('comments');
      doc.transact(() => {
        for (let i = 0; i < yComments.length; i++) {
          const yMap = yComments.get(i);
          if (yMap instanceof Y.Map && yMap.get('id') === commentId) {
            yMap.set('resolved', true);
            break;
          }
        }
      });
    },
    [doc]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      if (!doc) return;
      const yComments: Y.Array<Y.Map<unknown>> = doc.getArray('comments');
      doc.transact(() => {
        for (let i = 0; i < yComments.length; i++) {
          const yMap = yComments.get(i);
          if (yMap instanceof Y.Map && yMap.get('id') === commentId) {
            yComments.delete(i, 1);
            break;
          }
        }
      });
    },
    [doc]
  );

  return { comments, addComment, resolveComment, deleteComment };
}
