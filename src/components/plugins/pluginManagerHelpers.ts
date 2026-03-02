export type TabType = 'installed' | 'marketplace' | 'updates';
export type ViewMode = 'grid' | 'list';

export const PLUGIN_GRID_ROW_HEIGHT = 220;
export const PLUGIN_LIST_ROW_HEIGHT = 76;

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
