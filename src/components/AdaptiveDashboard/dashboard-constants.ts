/**
 * Constants for the AdaptiveDashboard component
 */

export const CARD_BORDER_COLORS: Record<string, string> = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  purple: 'border-l-purple-500',
  red: 'border-l-red-500',
  orange: 'border-l-orange-500',
  gray: 'border-l-gray-500',
};

export const STATS_DATA = [
  { title: 'Total Projects', value: '12', change: '+2 this week' },
  { title: 'Active Workflows', value: '5', change: '3 automated' },
  { title: 'Team Members', value: '8', change: 'All active' },
  { title: 'Completion Rate', value: '92%', change: 'Above target' },
] as const;

export const AUTOMATION_INSIGHTS = [
  { label: 'Time Saved This Week', badge: '2.5 hours', percent: 65, bgColor: 'bg-blue-50', barBg: 'bg-blue-100', barFg: 'bg-blue-600' },
  { label: 'Tasks Automated', badge: '18', percent: 72, bgColor: 'bg-green-50', barBg: 'bg-green-100', barFg: 'bg-green-600' },
  { label: 'Workflow Efficiency', badge: '84%', percent: 84, bgColor: 'bg-purple-50', barBg: 'bg-purple-100', barFg: 'bg-purple-600' },
] as const;
