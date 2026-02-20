/**
 * Usage Bar — Reusable progress bar for plan quota display
 *
 * Sprint 38: Phase 5.1 Monetization & Pricing
 */

import { isUnlimited, formatStorage } from '../../config/plans';
import { getUsageColor } from '../../services/usageService';

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  /** 'count' | 'storage' — determines how values are formatted */
  unit?: 'count' | 'storage';
}

export function UsageBar({ label, current, limit, unit = 'count' }: UsageBarProps) {
  const unlimited = isUnlimited(limit);
  const percentage = unlimited ? 0 : limit === 0 ? 100 : Math.min(100, Math.round((current / limit) * 100));
  const colorClass = getUsageColor(percentage);

  const formatValue = (val: number) => {
    if (unit === 'storage') return formatStorage(val);
    return val.toLocaleString();
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        <span className="text-neutral-500 dark:text-neutral-400">
          {formatValue(current)} / {unlimited ? 'Unlimited' : formatValue(limit)}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={limit}
            aria-label={`${label}: ${current} of ${formatValue(limit)} used`}
          />
        </div>
      )}
    </div>
  );
}
