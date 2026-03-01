import React from 'react';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

interface FileDeleteDialogProps {
  filename: string | null;
  onClose: () => void;
  onConfirm: (filename: string) => void;
}

export const FileDeleteDialog: React.FC<FileDeleteDialogProps> = ({
  filename,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={!!filename} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete File</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{filename}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (filename) onConfirm(filename);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
