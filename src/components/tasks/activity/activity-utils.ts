import type { Activity } from './ActivityItem';

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const groupActivitiesByDate = (activities: Activity[]): [string, Activity[]][] => {
  const grouped = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (isSameDay(date, today)) {
      label = 'Today';
    } else if (isSameDay(date, yesterday)) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (!grouped.has(label)) {
      grouped.set(label, []);
    }
    grouped.get(label)!.push(activity);
  });

  return Array.from(grouped.entries());
};
