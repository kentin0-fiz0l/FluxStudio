import {
  Plus,
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import { statusConfig, annotationTypeConfig } from './constants';
import type { Annotation, DesignFile } from './types';

interface ReviewToolbarProps {
  selectedFile: DesignFile;
  zoom: number;
  setZoom: (zoom: number) => void;
  annotationType: Annotation['type'];
  setAnnotationType: (type: Annotation['type']) => void;
  isAddingAnnotation: boolean;
  setIsAddingAnnotation: (value: boolean) => void;
  onStatusChange: (status: DesignFile['status']) => void;
  isReadOnly?: boolean;
}

export function ReviewToolbar({
  selectedFile,
  zoom,
  setZoom,
  annotationType,
  setAnnotationType,
  isAddingAnnotation,
  setIsAddingAnnotation,
  onStatusChange,
  isReadOnly = false,
}: ReviewToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900">{selectedFile.name}</h3>
          <Badge className={cn('text-white', statusConfig[selectedFile.status].color)}>
            {statusConfig[selectedFile.status].label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="px-2 text-sm">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Annotation Tools */}
          {!isReadOnly && (
            <div className="flex items-center gap-1">
              <Select value={annotationType} onValueChange={(value) => setAnnotationType(value as Annotation['type'])}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(annotationTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" aria-hidden="true" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={isAddingAnnotation ? "primary" : "outline"}
                onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
              >
                {isAddingAnnotation ? (
                  <>
                    <X className="h-4 w-4 mr-2" aria-hidden="true" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Comment
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Share
            </Button>

            {!isReadOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Change Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => onStatusChange(status as DesignFile['status'])}
                    >
                      <config.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
