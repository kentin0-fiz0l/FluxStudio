import React from 'react';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Folder } from 'lucide-react';
import type { Project } from './utils';

interface FileLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string | null;
  projects: Project[];
  isLinking: boolean;
  onLink: (filename: string, projectId: string) => void;
  onCancel: () => void;
}

export const FileLinkDialog: React.FC<FileLinkDialogProps> = ({
  open,
  onOpenChange,
  filename,
  projects,
  isLinking,
  onLink,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link File to Project</DialogTitle>
          <DialogDescription>
            Select a project to organize "{filename}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Project</label>
            <Select
              onValueChange={(projectId) => {
                if (filename) {
                  onLink(filename, projectId);
                }
              }}
              disabled={isLinking}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" aria-hidden="true" />
                      {project.title}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLinking}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
