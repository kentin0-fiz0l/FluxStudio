'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Loader2, Trash2, Upload, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ProfilePictureUploadProps {
  currentImage?: string | null;
  userName?: string | null;
  onUploadComplete?: (imageUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ProfilePictureUpload({
  currentImage,
  userName,
  onUploadComplete,
  size = 'lg',
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const userInitial = userName?.charAt(0)?.toUpperCase() || '?';
  const displayImage = previewUrl || currentImage;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setShowOptions(false);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a JPEG, PNG, GIF, or WebP image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    // Show preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/user/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Update preview with actual URL
      setPreviewUrl(null);
      onUploadComplete?.(data.user.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    setError(null);
    setIsDeleting(true);
    setShowOptions(false);

    try {
      const response = await fetch('/api/user/profile/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove image');
      }

      setPreviewUrl(null);
      onUploadComplete?.(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image');
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar container */}
      <div className="relative">
        <div
          className={clsx(
            sizeClasses[size],
            'rounded-full bg-brand-violet flex items-center justify-center shadow-glow-violet overflow-hidden cursor-pointer',
            'transition-all hover:ring-2 hover:ring-brand-mint hover:ring-offset-2 hover:ring-offset-brand-midnight'
          )}
          onClick={() => setShowOptions(!showOptions)}
        >
          {isUploading || isDeleting ? (
            <Loader2 className={clsx(iconSizes[size], 'text-white animate-spin')} />
          ) : displayImage ? (
            <Image
              src={displayImage}
              alt={userName || 'Profile'}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              unoptimized={displayImage.startsWith('blob:')}
            />
          ) : (
            <span className={clsx(textSizes[size], 'text-white font-bold')}>
              {userInitial}
            </span>
          )}
        </div>

        {/* Camera badge */}
        <button
          onClick={triggerFileSelect}
          disabled={isUploading || isDeleting}
          className={clsx(
            'absolute -bottom-1 -right-1 p-1.5 rounded-full',
            'bg-brand-surface border-2 border-brand-midnight',
            'text-brand-mint hover:bg-brand-surfaceElevated',
            'transition-colors disabled:opacity-50'
          )}
          title="Upload photo"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Options dropdown */}
        {showOptions && !isUploading && !isDeleting && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-brand-surface rounded-lg shadow-card border border-white/10 overflow-hidden z-10">
            <button
              onClick={triggerFileSelect}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-brand-surfaceElevated transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload new
            </button>
            {displayImage && (
              <button
                onClick={handleRemove}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-coral hover:bg-brand-surfaceElevated transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            )}
            <button
              onClick={() => setShowOptions(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-brand-surfaceElevated transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-brand-coral text-center">{error}</p>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500 text-center">
        Click to change • JPEG, PNG, GIF, WebP • Max 5MB
      </p>
    </div>
  );
}

export default ProfilePictureUpload;
