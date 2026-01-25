/**
 * MediaGallery Component
 * Image/video carousel with navigation for portfolio item detail
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface Media {
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnail_url?: string;
  duration?: number;
}

interface MediaGalleryProps {
  media: Media[];
  title: string;
}

export function MediaGallery({ media, title }: MediaGalleryProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const currentMedia = media[currentMediaIndex];

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % media.length);
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <div className="relative w-full h-full bg-black">
      {currentMedia ? (
        <div className="w-full h-full flex items-center justify-center">
          {currentMedia.type === 'video' ? (
            <video
              src={currentMedia.url}
              controls
              className="max-w-full max-h-full"
            />
          ) : (
            <img
              src={currentMedia.url}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <Camera className="h-16 w-16 text-white/50" />
        </div>
      )}

      {/* Media Navigation */}
      {media.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
            onClick={prevMedia}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20"
            onClick={nextMedia}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {media.map((_, index) => (
              <button
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentMediaIndex ? 'bg-white' : 'bg-white/50'
                )}
                onClick={() => setCurrentMediaIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
