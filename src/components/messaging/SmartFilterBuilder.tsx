/**
 * Smart Filter Builder Component
 * Visual query builder for complex message filtering
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Filter,
  Save,
  Download,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { cn } from '../../lib/utils';
import { MessageType, Priority } from '../../types/messaging';

type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between';
type FilterField = 'content' | 'author' | 'date' | 'type' | 'priority' | 'hasAttachments' | 'tags';
type LogicalOperator = 'AND' | 'OR';

interface FilterCondition {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string | string[];
}

interface FilterGroup {
  id: string;
  operator: LogicalOperator;
  conditions: FilterCondition[];
}

interface SmartFilterBuilderProps {
  onApplyFilter?: (groups: FilterGroup[]) => void;
  presetFilters?: Array<{ name: string; groups: FilterGroup[] }>;
  className?: string;
}

const FIELD_OPTIONS = [
  { value: 'content', label: 'Message Content' },
  { value: 'author', label: 'Author' },
  { value: 'date', label: 'Date' },
  { value: 'type', label: 'Message Type' },
  { value: 'priority', label: 'Priority' },
  { value: 'hasAttachments', label: 'Has Attachments' },
  { value: 'tags', label: 'Tags' },
];

const OPERATOR_OPTIONS: Record<FilterField, { value: FilterOperator; label: string }[]> = {
  content: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
  ],
  author: [
    { value: 'equals', label: 'Is' },
  ],
  date: [
    { value: 'equals', label: 'On' },
    { value: 'greaterThan', label: 'After' },
    { value: 'lessThan', label: 'Before' },
    { value: 'between', label: 'Between' },
  ],
  type: [
    { value: 'equals', label: 'Is' },
  ],
  priority: [
    { value: 'equals', label: 'Is' },
    { value: 'greaterThan', label: 'Higher than' },
    { value: 'lessThan', label: 'Lower than' },
  ],
  hasAttachments: [
    { value: 'equals', label: 'Is' },
  ],
  tags: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Exactly matches' },
  ],
};

export function SmartFilterBuilder({
  onApplyFilter,
  presetFilters = [],
  className
}: SmartFilterBuilderProps) {
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
    {
      id: Math.random().toString(36).substr(2, 9),
      operator: 'AND',
      conditions: []
    }
  ]);

  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; groups: FilterGroup[] }>>(presetFilters);
  const [filterName, setFilterName] = useState('');
  const [showSave, setShowSave] = useState(false);

  // Add new group
  const addGroup = () => {
    const newGroup: FilterGroup = {
      id: Math.random().toString(36).substr(2, 9),
      operator: 'AND',
      conditions: []
    };
    setFilterGroups([...filterGroups, newGroup]);
  };

  // Remove group
  const removeGroup = (groupId: string) => {
    setFilterGroups(filterGroups.filter(g => g.id !== groupId));
  };

  // Add condition to group
  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: Math.random().toString(36).substr(2, 9),
      field: 'content',
      operator: 'contains',
      value: ''
    };

    setFilterGroups(filterGroups.map(group =>
      group.id === groupId
        ? { ...group, conditions: [...group.conditions, newCondition] }
        : group
    ));
  };

  // Remove condition
  const removeCondition = (groupId: string, conditionId: string) => {
    setFilterGroups(filterGroups.map(group =>
      group.id === groupId
        ? { ...group, conditions: group.conditions.filter(c => c.id !== conditionId) }
        : group
    ));
  };

  // Update condition
  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    setFilterGroups(filterGroups.map(group =>
      group.id === groupId
        ? {
            ...group,
            conditions: group.conditions.map(condition =>
              condition.id === conditionId
                ? { ...condition, ...updates }
                : condition
            )
          }
        : group
    ));
  };

  // Toggle group operator
  const toggleGroupOperator = (groupId: string) => {
    setFilterGroups(filterGroups.map(group =>
      group.id === groupId
        ? { ...group, operator: group.operator === 'AND' ? 'OR' : 'AND' }
        : group
    ));
  };

  // Save filter
  const saveFilter = () => {
    if (!filterName.trim()) return;

    const newFilter = {
      name: filterName,
      groups: filterGroups
    };

    setSavedFilters([...savedFilters, newFilter]);
    setFilterName('');
    setShowSave(false);

    // Save to localStorage
    localStorage.setItem('smart_filters', JSON.stringify([...savedFilters, newFilter]));
  };

  // Load filter
  const loadFilter = (filter: { name: string; groups: FilterGroup[] }) => {
    setFilterGroups(filter.groups);
  };

  // Delete saved filter
  const deleteSavedFilter = (name: string) => {
    const newFilters = savedFilters.filter(f => f.name !== name);
    setSavedFilters(newFilters);
    localStorage.setItem('smart_filters', JSON.stringify(newFilters));
  };

  // Apply filter
  const applyFilter = () => {
    if (onApplyFilter) {
      onApplyFilter(filterGroups);
    }
  };

  // Clear all
  const clearAll = () => {
    setFilterGroups([{
      id: Math.random().toString(36).substr(2, 9),
      operator: 'AND',
      conditions: []
    }]);
  };

  // Export filter as JSON
  const exportFilter = () => {
    const json = JSON.stringify(filterGroups, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filter-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get total condition count
  const totalConditions = filterGroups.reduce((sum, group) => sum + group.conditions.length, 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Smart Filter Builder
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build complex queries with multiple conditions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportFilter}
            disabled={totalConditions === 0}
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSave(!showSave)}
            disabled={totalConditions === 0}
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Save Filter Dialog */}
      <AnimatePresence>
        {showSave && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Save Filter</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Input
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && saveFilter()}
                  className="flex-1"
                />
                <Button size="sm" onClick={saveFilter} disabled={!filterName.trim()}>
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSave(false)}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Saved Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((filter) => (
                <Badge
                  key={filter.name}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent group gap-2 pr-1"
                  onClick={() => loadFilter(filter)}
                >
                  {filter.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedFilter(filter.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Groups */}
      <div className="space-y-3">
        {filterGroups.map((group, groupIndex) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">Group {groupIndex + 1}</CardTitle>
                    {group.conditions.length > 1 && (
                      <Badge
                        variant={group.operator === 'AND' ? 'default' : 'secondary'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleGroupOperator(group.id)}
                      >
                        {group.operator}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => addCondition(group.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    {filterGroups.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:text-destructive"
                        onClick={() => removeGroup(group.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <AnimatePresence>
                  {group.conditions.map((condition, condIndex) => (
                    <motion.div
                      key={condition.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
                    >
                      {/* Field */}
                      <Select
                        value={condition.field}
                        onValueChange={(value) =>
                          updateCondition(group.id, condition.id, {
                            field: value as FilterField,
                            operator: OPERATOR_OPTIONS[value as FilterField][0].value
                          })
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Operator */}
                      <Select
                        value={condition.operator}
                        onValueChange={(value) =>
                          updateCondition(group.id, condition.id, { operator: value as FilterOperator })
                        }
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATOR_OPTIONS[condition.field].map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value */}
                      <Input
                        value={condition.value as string}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, { value: e.target.value })
                        }
                        placeholder="Value..."
                        className="flex-1 h-8 text-xs"
                      />

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:text-destructive shrink-0"
                        onClick={() => removeCondition(group.id, condition.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>

                      {/* AND/OR indicator */}
                      {condIndex < group.conditions.length - 1 && (
                        <Badge variant="outline" className="absolute -bottom-4 left-4 text-[10px] px-1.5 py-0">
                          {group.operator}
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {group.conditions.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Click + to add conditions
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OR indicator between groups */}
            {groupIndex < filterGroups.length - 1 && (
              <div className="flex items-center justify-center py-1">
                <Badge variant="secondary" className="text-xs">OR</Badge>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addGroup}>
            <Plus className="h-3 w-3 mr-1" />
            Add Group
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={totalConditions === 0}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {totalConditions > 0 && (
            <Badge variant="secondary">
              {totalConditions} condition{totalConditions !== 1 ? 's' : ''}
            </Badge>
          )}

          <Button
            onClick={applyFilter}
            disabled={totalConditions === 0}
          >
            <Filter className="h-3 w-3 mr-2" />
            Apply Filter
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SmartFilterBuilder;
