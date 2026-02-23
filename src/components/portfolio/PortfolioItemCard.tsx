/**
 * PortfolioItemCard Component
 * Grid/list item card for portfolio showcase
 */

import React from 'react';
import {
  Eye,
  Heart,
  Share2,
  Star,
  Play,
  Edit3,
  Trash2,
  Camera,
  Video,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import type { PortfolioItem } from './types';

interface PortfolioItemCardProps {
  item: PortfolioItem;
  viewMode: 'grid' | 'list';
  isOwner: boolean;
  onClick: () => void;
  onLike: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const PortfolioItemCard = React.memo(function PortfolioItemCard({
  item,
  viewMode,
  isOwner,
  onClick,
  onLike,
  onShare,
  onEdit,
  onDelete,
}: PortfolioItemCardProps) {
  const primaryMedia = item.media[0];
  const MediaIcon = primaryMedia?.type === 'video' ? Video :
                   primaryMedia?.type === 'document' ? FileText : Camera;

  if (viewMode === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={onClick}>
        <div className="flex">
          <div className="w-48 h-32 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
            {primaryMedia ? (
              <img
                src={primaryMedia.thumbnail_url || primaryMedia.url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MediaIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                  {item.is_featured && (
                    <Badge className="bg-yellow-500">
                      <Star className="h-3 w-3 mr-1" aria-hidden="true" />
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span>{item.project_details.client}</span>
                  <span>•</span>
                  <span>{item.project_details.year}</span>
                  <span>•</span>
                  <span>{item.project_details.ensemble_type}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-1 ml-4">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Edit">
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  {item.metrics.views}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  {item.metrics.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  {item.metrics.shares}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label="Like">
                  <Heart className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onShare(); }} aria-label="Share">
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group" onClick={onClick}>
      <div className="relative">
        <div className="aspect-video bg-gray-100 dark:bg-gray-800">
          {primaryMedia ? (
            <img
              src={primaryMedia.thumbnail_url || primaryMedia.url}
              alt={item.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MediaIcon className="h-12 w-12 text-gray-400" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Media indicators */}
        <div className="absolute top-3 right-3 flex gap-2">
          {item.media.length > 1 && (
            <Badge className="bg-black/70 text-white">
              +{item.media.length - 1}
            </Badge>
          )}
          {primaryMedia?.type === 'video' && (
            <Badge className="bg-black/70 text-white">
              <Play className="h-3 w-3 mr-1" aria-hidden="true" />
              Video
            </Badge>
          )}
        </div>

        {item.is_featured && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-yellow-500">
              <Star className="h-3 w-3 mr-1" aria-hidden="true" />
              Featured
            </Badge>
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onLike(); }}
              aria-label="Like"
            >
              <Heart className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{item.title}</h3>
          {isOwner && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Edit">
                <Edit3 className="h-3 w-3" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span>{item.project_details.client}</span>
          <span>{item.project_details.year}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {item.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{item.tags.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" aria-hidden="true" />
              {item.metrics.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" aria-hidden="true" />
              {item.metrics.likes}
            </span>
          </div>
          <span>{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
});
