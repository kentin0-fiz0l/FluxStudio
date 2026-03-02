import { TemplateVariable } from '@/services/templates/types';

interface VariableInputProps {
  variable: TemplateVariable;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function VariableInput({ variable, value, onChange }: VariableInputProps) {
  switch (variable.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
        </label>
      );

    case 'select':
      return (
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {variable.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
          />
          <input
            type="text"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      );

    case 'number':
      return (
        <input
          type="number"
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          min={variable.validation?.min}
          max={variable.validation?.max}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );

    default:
      return (
        <input
          type="text"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );
  }
}
