/**
 * PortfolioItemDetail Component
 * Full item modal with media gallery and details panel
 */

import { motion } from 'framer-motion';
import {
  Eye,
  Heart,
  Share2,
  Star,
  X,
  MapPin,
  Award,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MediaGallery } from './MediaGallery';
import type { PortfolioItem } from './types';

interface PortfolioItemDetailProps {
  item: PortfolioItem;
  onClose: () => void;
  onLike: () => void;
  onShare: () => void;
}

export function PortfolioItemDetail({
  item,
  onClose,
  onLike,
  onShare,
}: PortfolioItemDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full">
          {/* Media Section */}
          <div className="flex-1 bg-black relative">
            <MediaGallery media={item.media} title={item.title} />

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>

          {/* Info Panel */}
          <div className="w-96 bg-white flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h2>
                  {item.is_featured && (
                    <Badge className="bg-yellow-500 mb-2">
                      <Star className="h-3 w-3 mr-1" aria-hidden="true" />
                      Featured
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-gray-600 mb-4">{item.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Client:</span>
                  <div className="font-medium">{item.project_details.client}</div>
                </div>
                <div>
                  <span className="text-gray-500">Year:</span>
                  <div className="font-medium">{item.project_details.year}</div>
                </div>
                <div>
                  <span className="text-gray-500">Ensemble:</span>
                  <div className="font-medium">{item.project_details.ensemble_type}</div>
                </div>
                <div>
                  <span className="text-gray-500">Service:</span>
                  <div className="font-medium">{item.project_details.service_category}</div>
                </div>
              </div>

              {item.project_details.location && (
                <div className="mt-4">
                  <span className="text-gray-500 text-sm">Location:</span>
                  <div className="font-medium flex items-center gap-1">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {item.project_details.location}
                  </div>
                </div>
              )}

              {item.project_details.awards && item.project_details.awards.length > 0 && (
                <div className="mt-4">
                  <span className="text-gray-500 text-sm">Awards:</span>
                  <div className="mt-1 space-y-1">
                    {item.project_details.awards.map((award, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                        <span className="text-sm">{award}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-wrap gap-1">
                {item.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4 text-sm text-gray-500">
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
              </div>

              <div className="flex gap-2">
                <Button onClick={onLike} className="flex-1">
                  <Heart className="h-4 w-4 mr-2" aria-hidden="true" />
                  Like
                </Button>
                <Button variant="outline" onClick={onShare} className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
