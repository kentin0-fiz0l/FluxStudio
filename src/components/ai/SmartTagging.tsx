import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  TrendingUp,
  Hash,
  Search,
  Check,
  Sparkles,
  BarChart3,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface TagData {
  id: string;
  name: string;
  category?: string;
  confidence?: number; // For AI-generated tags (0-1)
  count: number;
  color?: string;
  isAI?: boolean;
  isCustom?: boolean;
  parentId?: string; // For hierarchical tags
  createdAt: Date;
  lastUsed: Date;
}

interface TagHierarchy {
  tag: TagData;
  children: TagHierarchy[];
}

interface TagSuggestion {
  name: string;
  confidence: number;
  reason: string;
}

interface SmartTaggingProps {
  fileId?: string;
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  showAnalytics?: boolean;
  showHierarchy?: boolean;
  allowBulkOperations?: boolean;
}

// Mock data for demonstration
const mockTags: TagData[] = [
  {
    id: '1',
    name: 'design',
    category: 'project-type',
    count: 145,
    color: '#3B82F6',
    parentId: undefined,
    createdAt: new Date('2024-01-01'),
    lastUsed: new Date('2024-10-15'),
  },
  {
    id: '2',
    name: 'ui-design',
    category: 'project-type',
    count: 87,
    color: '#3B82F6',
    parentId: '1',
    createdAt: new Date('2024-01-15'),
    lastUsed: new Date('2024-10-14'),
  },
  {
    id: '3',
    name: 'branding',
    category: 'project-type',
    count: 62,
    color: '#8B5CF6',
    parentId: '1',
    createdAt: new Date('2024-02-01'),
    lastUsed: new Date('2024-10-13'),
  },
  {
    id: '4',
    name: 'high-priority',
    category: 'status',
    count: 43,
    color: '#EF4444',
    isAI: true,
    createdAt: new Date('2024-03-01'),
    lastUsed: new Date('2024-10-15'),
  },
  {
    id: '5',
    name: 'client-work',
    category: 'source',
    count: 98,
    color: '#10B981',
    createdAt: new Date('2024-01-20'),
    lastUsed: new Date('2024-10-14'),
  },
  {
    id: '6',
    name: 'revision',
    category: 'status',
    count: 34,
    color: '#F59E0B',
    isAI: true,
    createdAt: new Date('2024-04-01'),
    lastUsed: new Date('2024-10-12'),
  },
];

const mockSuggestions: TagSuggestion[] = [
  { name: 'modern-design', confidence: 0.92, reason: 'Based on file content analysis' },
  { name: 'minimalist', confidence: 0.87, reason: 'Color palette suggests minimalist style' },
  { name: 'professional', confidence: 0.81, reason: 'Typography and layout patterns' },
  { name: 'corporate', confidence: 0.76, reason: 'Similar to corporate design files' },
];

export const SmartTagging: React.FC<SmartTaggingProps> = ({
  fileId: _fileId,
  tags: initialTags = [],
  onTagsChange,
  showAnalytics = true,
  showHierarchy = true,
  allowBulkOperations: _allowBulkOperations = false,
}) => {
  const [allTags, setAllTags] = useState<TagData[]>(mockTags);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>(mockSuggestions);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('count');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));
  const [_editingTag, _setEditingTag] = useState<string | null>(null);

  // Build tag hierarchy
  const tagHierarchy = useMemo(() => {
    const buildHierarchy = (parentId: string | undefined): TagHierarchy[] => {
      return allTags
        .filter((tag) => tag.parentId === parentId)
        .map((tag) => ({
          tag,
          children: buildHierarchy(tag.id),
        }));
    };
    return buildHierarchy(undefined);
  }, [allTags]);

  // Filter and sort tags
  const filteredTags = useMemo(() => {
    const filtered = allTags.filter((tag) => {
      const matchesSearch = tag.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || tag.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'count':
          return b.count - a.count;
        case 'recent':
          return b.lastUsed.getTime() - a.lastUsed.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [allTags, searchQuery, selectedCategory, sortBy]);

  // Get categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allTags.forEach((tag) => {
      if (tag.category) cats.add(tag.category);
    });
    return Array.from(cats);
  }, [allTags]);

  // Analytics data
  const analytics = useMemo(() => {
    const totalTags = allTags.length;
    const aiTags = allTags.filter((t) => t.isAI).length;
    const customTags = allTags.filter((t) => t.isCustom).length;
    const mostUsed = [...allTags].sort((a, b) => b.count - a.count).slice(0, 5);
    const trending = [...allTags]
      .filter((t) => {
        const daysSinceUsed =
          (Date.now() - t.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUsed <= 7;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalTags,
      aiTags,
      customTags,
      mostUsed,
      trending,
    };
  }, [allTags]);

  // Handle tag selection
  const handleToggleTag = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];

    setSelectedTags(newTags);
    onTagsChange?.(newTags);
  };

  // Handle add custom tag
  const handleAddTag = () => {
    if (!newTagName.trim()) return;

    const newTag: TagData = {
      id: Date.now().toString(),
      name: newTagName.trim().toLowerCase().replace(/\s+/g, '-'),
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      count: 1,
      isCustom: true,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    setAllTags([...allTags, newTag]);
    setSelectedTags([...selectedTags, newTag.name]);
    onTagsChange?.([...selectedTags, newTag.name]);
    setNewTagName('');
    setIsAddingTag(false);
  };

  // Handle accept AI suggestion
  const handleAcceptSuggestion = (suggestion: TagSuggestion) => {
    const existingTag = allTags.find((t) => t.name === suggestion.name);

    if (!existingTag) {
      const newTag: TagData = {
        id: Date.now().toString(),
        name: suggestion.name,
        confidence: suggestion.confidence,
        count: 1,
        isAI: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      };
      setAllTags([...allTags, newTag]);
    }

    setSelectedTags([...selectedTags, suggestion.name]);
    onTagsChange?.([...selectedTags, suggestion.name]);
    setSuggestions(suggestions.filter((s) => s.name !== suggestion.name));
  };

  // Handle reject AI suggestion
  const handleRejectSuggestion = (suggestion: TagSuggestion) => {
    setSuggestions(suggestions.filter((s) => s.name !== suggestion.name));
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Render tag hierarchy
  const renderTagHierarchy = (hierarchies: TagHierarchy[], level: number = 0) => {
    return hierarchies.map(({ tag, children }) => (
      <div key={tag.id} style={{ marginLeft: `${level * 16}px` }}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 py-1"
        >
          {children.length > 0 && (
            <button
              onClick={() => toggleCategory(tag.id)}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              {expandedCategories.has(tag.id) ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          <button
            onClick={() => handleToggleTag(tag.name)}
            className={`
              flex items-center gap-2 px-2 py-1 rounded-full text-sm
              transition-all duration-200
              ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {tag.isAI && <Sparkles className="w-3 h-3" />}
            <span>{tag.name}</span>
            <span className="text-xs opacity-75">({tag.count})</span>
            {tag.confidence && (
              <span className="text-xs opacity-75">
                {Math.round(tag.confidence * 100)}%
              </span>
            )}
          </button>
        </motion.div>
        {children.length > 0 && expandedCategories.has(tag.id) && (
          <div>{renderTagHierarchy(children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Smart Tagging</h3>
          {selectedTags.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {selectedTags.length} selected
            </span>
          )}
        </div>
        <button
          onClick={() => setIsAddingTag(!isAddingTag)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add Tag</span>
        </button>
      </div>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h4 className="text-sm font-medium text-gray-700">AI Suggestions</h4>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {suggestions.map((suggestion) => (
                <motion.div
                  key={suggestion.name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {suggestion.name}
                      </span>
                      <span className="text-xs text-purple-600">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{suggestion.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptSuggestion(suggestion)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Accept suggestion"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(suggestion)}
                      className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      title="Reject suggestion"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add Tag Form */}
      <AnimatePresence>
        {isAddingTag && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Enter tag name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingTag(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="count">Most Used</option>
            <option value="name">Name</option>
            <option value="recent">Recently Used</option>
          </select>
        </div>
      </div>

      {/* Tag List */}
      <div className="mb-6">
        {showHierarchy ? (
          <div className="space-y-1">{renderTagHierarchy(tagHierarchy)}</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filteredTags.map((tag) => (
              <motion.button
                key={tag.id}
                onClick={() => handleToggleTag(tag.name)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                  transition-all duration-200
                  ${
                    selectedTags.includes(tag.name)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {tag.isAI && <Sparkles className="w-3 h-3" />}
                <span>{tag.name}</span>
                <span className="text-xs opacity-75">({tag.count})</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Analytics */}
      {showAnalytics && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <h4 className="text-sm font-medium text-gray-700">Tag Analytics</h4>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.totalTags}
              </div>
              <div className="text-xs text-gray-600">Total Tags</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.aiTags}
              </div>
              <div className="text-xs text-gray-600">AI Generated</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics.customTags}
              </div>
              <div className="text-xs text-gray-600">Custom Tags</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Most Used */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <h5 className="text-xs font-medium text-gray-700">Most Used</h5>
              </div>
              <div className="space-y-1">
                {analytics.mostUsed.map((tag, index) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600">
                      {index + 1}. {tag.name}
                    </span>
                    <span className="text-gray-500">{tag.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <h5 className="text-xs font-medium text-gray-700">
                  Trending (7 days)
                </h5>
              </div>
              <div className="space-y-1">
                {analytics.trending.map((tag, index) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-600">
                      {index + 1}. {tag.name}
                    </span>
                    <span className="text-green-600">{tag.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Tags Summary */}
      {selectedTags.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Selected Tags ({selectedTags.length})
            </span>
            <button
              onClick={() => {
                setSelectedTags([]);
                onTagsChange?.([]);
              }}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tagName) => (
              <span
                key={tagName}
                className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full"
              >
                {tagName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartTagging;
