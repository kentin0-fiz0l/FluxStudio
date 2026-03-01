import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Edit3,
  CheckCircle,
  XCircle,
  RotateCcw,
  Reply,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { useAuth } from '@/store/slices/authSlice';
import { cn } from '../../lib/utils';
import { annotationTypeConfig, priorityConfig } from './constants';
import type { Annotation, AnnotationReply } from './types';

interface AnnotationPanelProps {
  annotation: Annotation;
  onClose: () => void;
  onUpdate: (updates: Partial<Annotation>) => void;
  isReadOnly: boolean;
}

export function AnnotationPanel({
  annotation,
  onClose,
  onUpdate,
  isReadOnly
}: AnnotationPanelProps) {
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [editingContent, setEditingContent] = useState(annotation.content);
  const [isEditing, setIsEditing] = useState(!annotation.content); // Auto-edit if no content

  const typeConfig = annotationTypeConfig[annotation.type];
  const priorityInfo = priorityConfig[annotation.priority];
  const TypeIcon = typeConfig.icon;

  const handleSave = () => {
    if (editingContent.trim()) {
      onUpdate({ content: editingContent.trim() });
      setIsEditing(false);
    }
  };

  const handleAddReply = useCallback(() => {
    if (replyContent.trim()) {
      const newReply: AnnotationReply = {
        id: `reply-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`,
        content: replyContent.trim(),
        author: {
          id: user?.id || '',
          name: user?.name || '',
          avatar: user?.avatar,
          role: user?.userType || 'client'
        },
        created_at: new Date().toISOString()
      };

      onUpdate({
        replies: [...(annotation.replies || []), newReply]
      });
      setReplyContent('');
    }
  }, [replyContent, user, annotation.replies, onUpdate]);

  const handleStatusChange = (status: Annotation['status']) => {
    onUpdate({ status });
  };

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="w-96 bg-white border-l border-gray-200 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', typeConfig.color.replace('bg-', 'bg-opacity-20 text-'))}>
              <TypeIcon className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="font-medium">{typeConfig.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Avatar className="h-6 w-6">
            <AvatarImage src={annotation.author.avatar} />
            <AvatarFallback>{annotation.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span>{annotation.author.name}</span>
          <span>•</span>
          <span>{new Date(annotation.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Main Comment */}
        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                placeholder="Enter your comment..."
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={!editingContent.trim()}>
                  Save
                </Button>
                {annotation.content && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditing(false);
                    setEditingContent(annotation.content);
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-900">{annotation.content}</p>
              {!isReadOnly && annotation.author.id === user?.id && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Status Actions */}
        {!isReadOnly && annotation.status === 'open' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Mark as:</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('resolved')}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Resolved
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('dismissed')}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {annotation.status !== 'open' && (
          <div className="flex items-center gap-2 text-sm">
            {annotation.status === 'resolved' ? (
              <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />
            )}
            <span className="capitalize text-gray-600">{annotation.status}</span>
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange('open')}
                className="ml-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                Reopen
              </Button>
            )}
          </div>
        )}

        <Separator />

        {/* Replies */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">
            Replies ({annotation.replies?.length || 0})
          </h4>

          {annotation.replies?.map((reply) => (
            <div key={reply.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar className="h-6 w-6">
                <AvatarImage src={reply.author.avatar} />
                <AvatarFallback>{reply.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{reply.author.name}</span>
                  <span className="text-gray-500">
                    {new Date(reply.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{reply.content}</p>
              </div>
            </div>
          ))}

          {/* Add Reply */}
          {!isReadOnly && annotation.status === 'open' && (
            <div className="space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Add a reply..."
                rows={2}
              />
              <Button
                size="sm"
                onClick={handleAddReply}
                disabled={!replyContent.trim()}
              >
                <Reply className="h-4 w-4 mr-2" aria-hidden="true" />
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
