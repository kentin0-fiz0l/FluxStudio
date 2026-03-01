import { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import type { Milestone } from './types';

interface MilestoneFormProps {
  milestone: Milestone | null;
  onSave: (milestone: Partial<Milestone>) => void;
  onCancel: () => void;
}

export function MilestoneForm({ milestone, onSave, onCancel }: MilestoneFormProps) {
  const [formData, setFormData] = useState({
    name: milestone?.name || '',
    description: milestone?.description || '',
    due_date: milestone?.due_date || '',
    assigned_to: milestone?.assigned_to || '',
    is_required: milestone?.is_required ?? true
  });

  const handleSave = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Milestone Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter milestone name"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter milestone description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Assigned To</label>
          <Input
            value={formData.assigned_to}
            onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
            placeholder="Enter assignee name"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!formData.name.trim()}>
          {milestone ? 'Update' : 'Create'} Milestone
        </Button>
      </div>
    </div>
  );
}
