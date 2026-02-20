/**
 * useMetMapComments — Yjs-backed comment CRUD for canvas comments.
 *
 * Sprint 32: Comments are stored in a Y.Array<Y.Map> at doc.getArray('comments').
 * Sprint 33: Added parentId for threading + reactions map.
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
  parentId: string | null;
  reactions: Record<string, string[]>; // emoji → [userId, ...]
}

export const REACTION_EMOJIS = ['👍', '✅', '👀', '❤️'] as const;

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
  yMap.set('parentId', comment.parentId ?? null);
  yMap.set('reactions', JSON.stringify(comment.reactions || {}));
  return yMap;
}

function yMapToComment(yMap: Y.Map<unknown>): CanvasComment {
  const data = yMap.toJSON();
  let reactions: Record<string, string[]> = {};
  if (typeof data.reactions === 'string') {
    try { reactions = JSON.parse(data.reactions); } catch { /* empty */ }
  }
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
    parentId: (data.parentId as string) || null,
    reactions,
  };
}

interface UseMetMapCommentsReturn {
  comments: CanvasComment[];
  addComment: (barStart: number, text: string, userId: string, username: string, color: string, barEnd?: number) => void;
  replyToComment: (parentId: string, text: string, userId: string, username: string, color: string) => void;
  resolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  toggleReaction: (commentId: string, emoji: string, userId: string) => void;
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
        parentId: null,
        reactions: {},
      };
      doc.transact(() => {
        yComments.push([commentToYMap(comment)]);
      });
    },
    [doc]
  );

  const replyToComment = useCallback(
    (parentId: string, text: string, userId: string, username: string, color: string) => {
      if (!doc) return;
      const yComments: Y.Array<Y.Map<unknown>> = doc.getArray('comments');
      // Find parent to inherit barStart
      let barStart = 1;
      for (let i = 0; i < yComments.length; i++) {
        const yMap = yComments.get(i);
        if (yMap instanceof Y.Map && yMap.get('id') === parentId) {
          barStart = (yMap.get('barStart') as number) || 1;
          break;
        }
      }
      const reply: CanvasComment = {
        id: crypto.randomUUID(),
        userId,
        username,
        color,
        barStart,
        text,
        createdAt: Date.now(),
        resolved: false,
        parentId,
        reactions: {},
      };
      doc.transact(() => {
        yComments.push([commentToYMap(reply)]);
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
        // Delete the comment and all its replies
        const toDelete: number[] = [];
        for (let i = 0; i < yComments.length; i++) {
          const yMap = yComments.get(i);
          if (yMap instanceof Y.Map) {
            const id = yMap.get('id') as string;
            const parent = yMap.get('parentId') as string | null;
            if (id === commentId || parent === commentId) {
              toDelete.push(i);
            }
          }
        }
        // Delete in reverse order to maintain indices
        for (let i = toDelete.length - 1; i >= 0; i--) {
          yComments.delete(toDelete[i], 1);
        }
      });
    },
    [doc]
  );

  const toggleReaction = useCallback(
    (commentId: string, emoji: string, userId: string) => {
      if (!doc) return;
      const yComments: Y.Array<Y.Map<unknown>> = doc.getArray('comments');
      doc.transact(() => {
        for (let i = 0; i < yComments.length; i++) {
          const yMap = yComments.get(i);
          if (yMap instanceof Y.Map && yMap.get('id') === commentId) {
            let reactions: Record<string, string[]> = {};
            const raw = yMap.get('reactions');
            if (typeof raw === 'string') {
              try { reactions = JSON.parse(raw); } catch { /* empty */ }
            }
            const users = reactions[emoji] || [];
            const idx = users.indexOf(userId);
            if (idx >= 0) {
              users.splice(idx, 1);
              if (users.length === 0) {
                delete reactions[emoji];
              } else {
                reactions[emoji] = users;
              }
            } else {
              reactions[emoji] = [...users, userId];
            }
            yMap.set('reactions', JSON.stringify(reactions));
            break;
          }
        }
      });
    },
    [doc]
  );

  return { comments, addComment, replyToComment, resolveComment, deleteComment, toggleReaction };
}
