export const FRECENCY_KEY = 'flux-command-frecency';
export const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 1-week half-life

export const categoryLabels: Record<string, string> = {
  create: 'Quick Actions',
  actions: 'Utilities',
  navigation: 'Go To',
  recent: 'Recent Projects',
};

export const catOrder: Record<string, number> = {
  create: 0,
  actions: 1,
  navigation: 2,
  recent: 3,
};
