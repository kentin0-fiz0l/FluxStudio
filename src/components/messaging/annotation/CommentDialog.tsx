/**
 * CommentDialog Component
 * Modal dialog for adding comments to annotations
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Save } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';

interface CommentDialogProps {
  isOpen: boolean;
  commentText: string;
  onCommentChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CommentDialog({
  isOpen,
  commentText,
  onCommentChange,
  onSave,
  onCancel
}: CommentDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
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
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Describe your feedback..."
              rows={3}
              className="mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={onSave}
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
  );
}
