/**
 * PortfolioFilters Component
 * Category filter, search input, view mode toggle, and add button
 */

import { Search, Grid3X3, List, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PortfolioItemForm } from './PortfolioItemForm';
import { categories } from './types';
import type { PortfolioItem } from './types';

interface PortfolioFiltersProps {
  selectedCategory: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  isOwner: boolean;
  isAddingItem: boolean;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onAddingItemChange: (isAdding: boolean) => void;
  onItemAdd?: (item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at' | 'metrics'>) => void;
}

export function PortfolioFilters({
  selectedCategory,
  searchQuery,
  viewMode,
  isOwner,
  isAddingItem,
  onCategoryChange,
  onSearchChange,
  onViewModeChange,
  onAddingItemChange,
  onItemAdd,
}: PortfolioFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-8">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search portfolio items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
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
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {isOwner && (
          <Dialog open={isAddingItem} onOpenChange={onAddingItemChange}>
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
                  onAddingItemChange(false);
                }}
                onCancel={() => onAddingItemChange(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
