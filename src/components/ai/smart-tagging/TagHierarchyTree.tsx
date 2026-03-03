import {
  Sparkles,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { TagHierarchy } from './types';

interface TagHierarchyTreeProps {
  hierarchy: TagHierarchy[];
  selectedTags: string[];
  expandedCategories: Set<string>;
  onToggleTag: (tagName: string) => void;
  onToggleCategory: (category: string) => void;
}

export function TagHierarchyTree({
  hierarchy,
  selectedTags,
  expandedCategories,
  onToggleTag,
  onToggleCategory,
}: TagHierarchyTreeProps) {
  const renderLevel = (hierarchies: TagHierarchy[], level: number = 0) => {
    return hierarchies.map(({ tag, children }) => (
      <div key={tag.id} style={{ marginLeft: `${level * 16}px` }}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 py-1"
        >
          {children.length > 0 && (
            <button
              onClick={() => onToggleCategory(tag.id)}
              className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
              aria-expanded={expandedCategories.has(tag.id)}
              aria-label={`Toggle ${tag.name} children`}
            >
              {expandedCategories.has(tag.id) ? (
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          )}
          <button
            onClick={() => onToggleTag(tag.name)}
            aria-pressed={selectedTags.includes(tag.name)}
            className={`
              flex items-center gap-2 px-2 py-1 rounded-full text-sm
              transition-all duration-200
              ${
                selectedTags.includes(tag.name)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            {tag.isAI && <Sparkles className="w-3 h-3" aria-hidden="true" />}
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
          <div>{renderLevel(children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return <div className="space-y-1">{renderLevel(hierarchy)}</div>;
}
