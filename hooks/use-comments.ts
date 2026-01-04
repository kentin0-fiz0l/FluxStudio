'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Comment {
  id: string;
  content: string;
  assetId: string;
  authorId: string;
  author?: {
    id: string;
    fullName: string;
    avatarUrl?: string;
  };
  parentCommentId?: string;
  position?: { x: number; y: number };
  timestamp?: number;
  cameraPosition?: object;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useComments(assetId: string) {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading, error } = useQuery({
    queryKey: ['comments', assetId],
    queryFn: async () => {
      return api.get<Comment[]>(`/api/assets/${assetId}/comments`);
    },
    enabled: !!assetId,
  });

  const addComment = useMutation({
    mutationFn: async (data: {
      content: string;
      position?: { x: number; y: number };
      timestamp?: number;
      cameraPosition?: object;
      parentCommentId?: string;
    }) => {
      return api.post<Comment>(`/api/assets/${assetId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assetId] });
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return api.patch<Comment>(`/api/comments/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assetId] });
    },
  });

  const resolveComment = useMutation({
    mutationFn: async ({ id, isResolved }: { id: string; isResolved: boolean }) => {
      return api.patch<Comment>(`/api/comments/${id}`, { isResolved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assetId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assetId] });
    },
  });

  return {
    comments,
    isLoading,
    error,
    addComment: addComment.mutate,
    updateComment: updateComment.mutate,
    resolveComment: resolveComment.mutate,
    deleteComment: deleteComment.mutate,
    isAddingComment: addComment.isPending,
  };
}
