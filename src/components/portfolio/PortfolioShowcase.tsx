import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Grid3X3,
  List,
  Search,
  Award,
  Plus,
  Settings,
  Camera,
  User
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

// Extracted components
import { PortfolioItemCard } from './PortfolioItemCard';
import { PortfolioItemDetail } from './PortfolioItemDetail';
import { PortfolioEditForm } from './PortfolioEditForm';
import { PortfolioItemForm } from './PortfolioItemForm';
import type { Portfolio, PortfolioItem } from './types';
import { categories } from './types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PortfolioShowcaseProps {
  portfolio: Portfolio;
  isOwner?: boolean;
  onItemAdd?: (item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at' | 'metrics'>) => void;
  onItemUpdate?: (id: string, updates: Partial<PortfolioItem>) => void;
  onItemDelete?: (id: string) => void;
  onPortfolioUpdate?: (updates: Partial<Portfolio>) => void;
}

export function PortfolioShowcase({
  portfolio,
  isOwner = false,
  onItemAdd,
  onItemUpdate,
  onItemDelete,
  onPortfolioUpdate
}: PortfolioShowcaseProps) {
  const { user: _user } = useAuth();
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
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
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

export default PortfolioShowcase;
