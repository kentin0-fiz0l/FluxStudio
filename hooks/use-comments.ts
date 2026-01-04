'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Comment } from '@/types/database';

export function useComments(assetId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading, error } = useQuery({
    queryKey: ['comments', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:users(id, full_name, avatar_url)
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          content: data.content,
          asset_id: assetId,
          author_id: user.user.id,
          position: data.position,
          timestamp: data.timestamp,
          camera_position: data.cameraPosition,
          parent_comment_id: data.parentCommentId,
        })
        .select()
        .single();

      if (error) throw error;
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assetId] });
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data: comment, error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assetId] });
    },
  });

  const resolveComment = useMutation({
    mutationFn: async ({ id, isResolved }: { id: string; isResolved: boolean }) => {
      const { data: comment, error } = await supabase
        .from('comments')
        .update({ is_resolved: isResolved })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', assetId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
