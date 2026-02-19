/**
 * TesterInfoForm - Collects tester information for user testing
 */

import * as React from 'react';
import { Button } from '@/components/ui';
import { TesterInfo } from '@/services/userTestLogger';

export interface TesterInfoFormProps {
  testerInfo: TesterInfo | null;
  onSave: (info: TesterInfo) => void;
}

export function TesterInfoForm({ testerInfo, onSave }: TesterInfoFormProps) {
  const [name, setName] = React.useState(testerInfo?.name || '');
  const [role, setRole] = React.useState<TesterInfo['role']>(testerInfo?.role || 'other');
  const [experience, setExperience] = React.useState<TesterInfo['experienceLevel']>(
    testerInfo?.experienceLevel || 'new'
  );

  const handleSave = () => {
    onSave({ name, role, experienceLevel: experience });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Name (optional)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name or alias"
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as TesterInfo['role'])}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500"
        >
          <option value="designer">Designer</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          Experience with FluxStudio
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="experience"
              value="new"
              checked={experience === 'new'}
              onChange={() => setExperience('new')}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">New user</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="experience"
              value="returning"
              checked={experience === 'returning'}
              onChange={() => setExperience('returning')}
              className="text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Returning user</span>
          </label>
        </div>
      </div>

      <Button variant="primary" size="sm" onClick={handleSave} className="w-full">
        Save Info
      </Button>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
        This information is stored locally and included in your test report.
      </p>
    </div>
  );
}
