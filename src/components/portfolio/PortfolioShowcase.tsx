import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Heart,
  Share2,
  ExternalLink,
  Filter,
  Grid3X3,
  List,
  Search,
  Calendar,
  Award,
  Users,
  MapPin,
  Clock,
  Star,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Edit3,
  Trash2,
  Settings,
  Camera,
  Video,
  FileText,
  Music
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  media: {
    type: 'image' | 'video' | 'document';
    url: string;
    thumbnail_url?: string;
    duration?: number; // for videos
  }[];
  project_details: {
    client: string;
    year: number;
    ensemble_type: string;
    service_category: string;
    location?: string;
    awards?: string[];
  };
  metrics: {
    views: number;
    likes: number;
    shares: number;
  };
  is_featured: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Portfolio {
  id: string;
  title: string;
  description: string;
  owner: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    bio?: string;
  };
  cover_image_url?: string;
  items: PortfolioItem[];
  stats: {
    total_items: number;
    total_views: number;
    featured_items: number;
  };
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface PortfolioShowcaseProps {
  portfolio: Portfolio;
  isOwner?: boolean;
  onItemAdd?: (item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at' | 'metrics'>) => void;
  onItemUpdate?: (id: string, updates: Partial<PortfolioItem>) => void;
  onItemDelete?: (id: string) => void;
  onPortfolioUpdate?: (updates: Partial<Portfolio>) => void;
}

const categories = [
  'All',
  'Uniform Design',
  'Show Concepts',
  'Props & Scenic',
  'Drill Design',
  'Complete Productions',
  'Competition Results',
  'Behind the Scenes'
];

const ensembleTypes = [
  'Marching Band',
  'Indoor Winds',
  'Winter Guard',
  'Indoor Percussion',
  'Drum Corps',
  'Parade Band'
];

const serviceCategories = [
  'Design Concepts',
  'Visual Production',
  'Performance Design',
  'Full Season Support'
];

export function PortfolioShowcase({
  portfolio,
  isOwner = false,
  onItemAdd,
  onItemUpdate,
  onItemDelete,
  onPortfolioUpdate
}: PortfolioShowcaseProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  // Filter portfolio items
  const filteredItems = portfolio.items.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Handle item interaction
  const handleItemLike = async (item: PortfolioItem) => {
    if (onItemUpdate) {
      onItemUpdate(item.id, {
        metrics: {
          ...item.metrics,
          likes: item.metrics.likes + 1
        }
      });
    }
  };

  const handleItemShare = async (item: PortfolioItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: item.description,
          url: window.location.href
        });

        if (onItemUpdate) {
          onItemUpdate(item.id, {
            metrics: {
              ...item.metrics,
              shares: item.metrics.shares + 1
            }
          });
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Portfolio Header */}
      <div className="relative overflow-hidden">
        {/* Cover Image */}
        {portfolio.cover_image_url ? (
          <div
            className="h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${portfolio.cover_image_url})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40" />
          </div>
        ) : (
          <div className="h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
        )}

        {/* Portfolio Info */}
        <div className="absolute inset-0 flex items-end">
          <div className="w-full p-8 text-white">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end gap-6">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={portfolio.owner.avatar} />
                  <AvatarFallback className="text-2xl">{portfolio.owner.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2">{portfolio.title}</h1>
                  <p className="text-xl text-white/90 mb-3">{portfolio.description}</p>

                  <div className="flex items-center gap-6 text-white/80">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{portfolio.owner.name}</span>
                      <Badge variant="outline" className="text-white border-white/50">
                        {portfolio.owner.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{portfolio.stats.total_views.toLocaleString()} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      <span>{portfolio.stats.featured_items} featured</span>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="text-white border-white/50 hover:bg-white/10">
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Portfolio
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Portfolio</DialogTitle>
                          <DialogDescription>Update your portfolio information</DialogDescription>
                        </DialogHeader>
                        <PortfolioEditForm
                          portfolio={portfolio}
                          onSave={(updates) => {
                            if (onPortfolioUpdate) onPortfolioUpdate(updates);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search portfolio items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center border border-gray-300 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {isOwner && (
              <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Portfolio Item</DialogTitle>
                    <DialogDescription>Showcase your latest work</DialogDescription>
                  </DialogHeader>
                  <PortfolioItemForm
                    item={null}
                    onSave={(item) => {
                      if (onItemAdd) onItemAdd(item);
                      setIsAddingItem(false);
                    }}
                    onCancel={() => setIsAddingItem(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Portfolio Grid/List */}
        <div className={cn(
          'grid gap-6',
          viewMode === 'grid'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1'
        )}>
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <PortfolioItemCard
                  item={item}
                  viewMode={viewMode}
                  isOwner={isOwner}
                  onClick={() => setSelectedItem(item)}
                  onLike={() => handleItemLike(item)}
                  onShare={() => handleItemShare(item)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => {
                    if (onItemDelete) onItemDelete(item.id);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">
              {selectedCategory !== 'All' || searchQuery
                ? 'Try adjusting your filters or search terms'
                : 'Start building your portfolio by adding your first item'
              }
            </p>
          </div>
        )}
      </div>

      {/* Portfolio Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <PortfolioItemDetail
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onLike={() => handleItemLike(selectedItem)}
            onShare={() => handleItemShare(selectedItem)}
          />
        )}
      </AnimatePresence>

      {/* Edit Item Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Portfolio Item</DialogTitle>
            <DialogDescription>Update your portfolio item</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <PortfolioItemForm
              item={editingItem}
              onSave={(updates) => {
                if (onItemUpdate && editingItem) {
                  onItemUpdate(editingItem.id, updates);
                }
                setEditingItem(null);
              }}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Portfolio Item Card Component
function PortfolioItemCard({
  item,
  viewMode,
  isOwner,
  onClick,
  onLike,
  onShare,
  onEdit,
  onDelete
}: {
  item: PortfolioItem;
  viewMode: 'grid' | 'list';
  isOwner: boolean;
  onClick: () => void;
  onLike: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const primaryMedia = item.media[0];
  const MediaIcon = primaryMedia?.type === 'video' ? Video :
                   primaryMedia?.type === 'document' ? FileText : Camera;

  if (viewMode === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer" onClick={onClick}>
        <div className="flex">
          <div className="w-48 h-32 bg-gray-100 flex-shrink-0">
            {primaryMedia ? (
              <img
                src={primaryMedia.thumbnail_url || primaryMedia.url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MediaIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex-1 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  {item.is_featured && (
                    <Badge className="bg-yellow-500">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
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
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {item.metrics.views}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {item.metrics.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="h-4 w-4" />
                  {item.metrics.shares}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onLike(); }}>
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onShare(); }}>
                  <Share2 className="h-4 w-4" />
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
        <div className="aspect-video bg-gray-100">
          {primaryMedia ? (
            <img
              src={primaryMedia.thumbnail_url || primaryMedia.url}
              alt={item.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MediaIcon className="h-12 w-12 text-gray-400" />
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
              <Play className="h-3 w-3 mr-1" />
              Video
            </Badge>
          )}
        </div>

        {item.is_featured && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-yellow-500">
              <Star className="h-3 w-3 mr-1" />
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
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onShare(); }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1">{item.title}</h3>
          {isOwner && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
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

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {item.metrics.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {item.metrics.likes}
            </span>
          </div>
          <span>{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Portfolio Item Detail Modal
function PortfolioItemDetail({
  item,
  onClose,
  onLike,
  onShare
}: {
  item: PortfolioItem;
  onClose: () => void;
  onLike: () => void;
  onShare: () => void;
}) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const currentMedia = item.media[currentMediaIndex];

  const nextMedia = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % item.media.length);
  };

  const prevMedia = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + item.media.length) % item.media.length);
  };

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
                    alt={item.title}
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
            {item.media.length > 1 && (
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
                  {item.media.map((_, index) => (
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

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
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
                      <Star className="h-3 w-3 mr-1" />
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
                    <MapPin className="h-4 w-4" />
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
                        <Award className="h-4 w-4 text-yellow-500" />
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
                    <Eye className="h-4 w-4" />
                    {item.metrics.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {item.metrics.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-4 w-4" />
                    {item.metrics.shares}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={onLike} className="flex-1">
                  <Heart className="h-4 w-4 mr-2" />
                  Like
                </Button>
                <Button variant="outline" onClick={onShare} className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
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

// Portfolio Edit Form
function PortfolioEditForm({
  portfolio,
  onSave
}: {
  portfolio: Portfolio;
  onSave: (updates: Partial<Portfolio>) => void;
}) {
  const [formData, setFormData] = useState({
    title: portfolio.title,
    description: portfolio.description,
    is_public: portfolio.is_public
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Portfolio Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="My Design Portfolio"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Showcase of my creative work in marching arts design"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={formData.is_public}
          onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
        />
        <label htmlFor="isPublic" className="text-sm">Make portfolio public</label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}

// Portfolio Item Form
function PortfolioItemForm({
  item,
  onSave,
  onCancel
}: {
  item: PortfolioItem | null;
  onSave: (item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at' | 'metrics'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || categories[1],
    tags: item?.tags || [],
    project_details: {
      client: item?.project_details.client || '',
      year: item?.project_details.year || new Date().getFullYear(),
      ensemble_type: item?.project_details.ensemble_type || ensembleTypes[0],
      service_category: item?.project_details.service_category || serviceCategories[0],
      location: item?.project_details.location || '',
      awards: item?.project_details.awards || []
    },
    is_featured: item?.is_featured || false,
    is_public: item?.is_public ?? true
  });

  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;

    onSave({
      ...formData,
      media: item?.media || [] // Keep existing media or empty array for new items
    });
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium">Title *</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Fall 2024 Uniform Design"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Category</label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.slice(1).map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe this project and your creative process..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium">Client</label>
          <Input
            value={formData.project_details.client}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              project_details: { ...prev.project_details, client: e.target.value }
            }))}
            placeholder="Westfield High School"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Year</label>
          <Input
            type="number"
            value={formData.project_details.year}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              project_details: { ...prev.project_details, year: parseInt(e.target.value) || new Date().getFullYear() }
            }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Ensemble Type</label>
          <Select
            value={formData.project_details.ensemble_type}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              project_details: { ...prev.project_details, ensemble_type: value }
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ensembleTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Service Category</label>
          <Select
            value={formData.project_details.service_category}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              project_details: { ...prev.project_details, service_category: value }
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {serviceCategories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Location</label>
        <Input
          value={formData.project_details.location}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            project_details: { ...prev.project_details, location: e.target.value }
          }))}
          placeholder="Westfield, NJ"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map(tag => (
            <Badge key={tag} variant="outline" className="flex items-center gap-1">
              {tag}
              <button onClick={() => removeTag(tag)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
          />
          <Button type="button" onClick={addTag} disabled={!newTag.trim()}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="featured"
            checked={formData.is_featured}
            onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
          />
          <label htmlFor="featured" className="text-sm">Featured item</label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="public"
            checked={formData.is_public}
            onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
          />
          <label htmlFor="public" className="text-sm">Public</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!formData.title.trim()}>
          {item ? 'Update' : 'Create'} Item
        </Button>
      </div>
    </div>
  );
}