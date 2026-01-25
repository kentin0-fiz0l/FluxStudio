/**
 * PortfolioEditForm Component
 * Form for editing portfolio metadata
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { Portfolio } from './types';

interface PortfolioEditFormProps {
  portfolio: Portfolio;
  onSave: (updates: Partial<Portfolio>) => void;
}

export function PortfolioEditForm({ portfolio, onSave }: PortfolioEditFormProps) {
  const [formData, setFormData] = useState({
    title: portfolio.title,
    description: portfolio.description,
    is_public: portfolio.is_public,
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
