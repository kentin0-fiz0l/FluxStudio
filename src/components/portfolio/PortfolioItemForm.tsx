/**
 * PortfolioItemForm Component
 * Form for adding/editing portfolio items
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { categories, ensembleTypes, serviceCategories } from './types';
import type { PortfolioItem } from './types';

interface PortfolioItemFormProps {
  item: PortfolioItem | null;
  onSave: (item: Omit<PortfolioItem, 'id' | 'created_at' | 'updated_at' | 'metrics'>) => void;
  onCancel: () => void;
}

export function PortfolioItemForm({ item, onSave, onCancel }: PortfolioItemFormProps) {
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
      awards: item?.project_details.awards || [],
    },
    is_featured: item?.is_featured || false,
    is_public: item?.is_public ?? true,
  });

  const [newTag, setNewTag] = useState('');

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;

    onSave({
      ...formData,
      media: item?.media || [],
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
              project_details: { ...prev.project_details, client: e.target.value },
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
              project_details: { ...prev.project_details, year: parseInt(e.target.value) || new Date().getFullYear() },
            }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Ensemble Type</label>
          <Select
            value={formData.project_details.ensemble_type}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              project_details: { ...prev.project_details, ensemble_type: value },
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
              project_details: { ...prev.project_details, service_category: value },
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
            project_details: { ...prev.project_details, location: e.target.value },
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
                <X className="h-3 w-3" aria-hidden="true" />
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
