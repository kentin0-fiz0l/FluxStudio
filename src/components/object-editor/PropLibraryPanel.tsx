/**
 * PropLibraryPanel - Browse and place predefined marching arts props
 */

import { useState, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  PROP_CATEGORIES,
  PROP_CATALOG,
  getPropsByCategory,
  searchProps,
  type PropCategory,
  type PropDefinition,
} from '../../services/scene3d/propRegistry';

interface PropLibraryPanelProps {
  onPlaceProp: (catalogId: string, variant?: string) => void;
  onClose: () => void;
}

export function PropLibraryPanel({ onPlaceProp, onClose }: PropLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PropCategory | 'all'>('all');

  const filteredProps = useMemo(() => {
    if (searchQuery.trim()) {
      return searchProps(searchQuery);
    }
    if (selectedCategory === 'all') {
      return PROP_CATALOG;
    }
    return getPropsByCategory(selectedCategory);
  }, [searchQuery, selectedCategory]);

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Prop Library</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search props..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {PROP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
              selectedCategory === cat.id
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Props Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          {filteredProps.map((prop) => (
            <PropCard key={prop.id} prop={prop} onPlace={onPlaceProp} />
          ))}
        </div>
        {filteredProps.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            No props found
          </div>
        )}
      </div>
    </div>
  );
}

function PropCard({ prop, onPlace }: { prop: PropDefinition; onPlace: (id: string, variant?: string) => void }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group">
      {/* Placeholder thumbnail */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded mb-2 flex items-center justify-center">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{prop.name}</div>
      <div className="text-[10px] text-gray-400 truncate">{prop.description}</div>

      {/* Color variants */}
      {prop.colorVariants && prop.colorVariants.length > 0 && (
        <div className="flex gap-0.5 mt-1">
          {prop.colorVariants.slice(0, 5).map((color) => (
            <div
              key={color}
              className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="w-full mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        onClick={() => onPlace(prop.id)}
      >
        <Plus className="w-3 h-3 mr-1" />
        Place
      </Button>
    </div>
  );
}
