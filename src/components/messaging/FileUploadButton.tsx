/**
 * File Upload Button Component
 * Handles file selection and upload for messages
 */

import React, { useRef } from 'react';
import { Paperclip, Image, File, Video } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

interface FileUploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUploadButton({
  onFilesSelected,
  multiple = false,
  accept = "*/*",
  maxSize = 10,
  className
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null, fileType?: string) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name} is too large (max ${maxSize}MB)`);
        return;
      }

      // Validate file type if specified
      if (fileType === 'image' && !file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file`);
        return;
      }

      if (fileType === 'video' && !file.type.startsWith('video/')) {
        errors.push(`${file.name} is not a video file`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const triggerFileInput = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    inputRef.current?.click();
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files, 'video')}
      />

      {/* Upload Button with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("shrink-0", className)}>
            <Paperclip className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => triggerFileInput(imageInputRef)}>
            <Image className="w-4 h-4 mr-2" />
            Upload Image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerFileInput(videoInputRef)}>
            <Video className="w-4 h-4 mr-2" />
            Upload Video
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => triggerFileInput(fileInputRef)}>
            <File className="w-4 h-4 mr-2" />
            Upload File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default FileUploadButton;