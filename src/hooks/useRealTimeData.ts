import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RealTimeDataConfig {
  endpoint: string;
  refreshInterval?: number;
  enabled?: boolean;
  transform?: (data: any) => any;
}

interface RealTimeDataState<T = any> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface RealTimeDataHook<T = any> extends RealTimeDataState<T> {
  refresh: () => Promise<void>;
  setData: (data: T) => void;
}

// Mock data generators for different endpoints
const mockDataGenerators = {
  '/api/projects': () => [
    {
      id: '1',
      name: 'Fall 2024 Marching Show',
      status: Math.random() > 0.7 ? 'active' : 'review',
      progress: Math.floor(Math.random() * 100),
      dueDate: '2024-11-15',
      team: 'Creative Team A',
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      lastActivity: `${Math.floor(Math.random() * 60)} minutes ago`,
    },
    {
      id: '2',
      name: 'Winter Guard Uniforms',
      status: Math.random() > 0.5 ? 'review' : 'active',
      progress: Math.floor(Math.random() * 100),
      dueDate: '2024-12-01',
      team: 'Design Team B',
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      lastActivity: `${Math.floor(Math.random() * 120)} minutes ago`,
    },
    {
      id: '3',
      name: 'Logo Redesign Project',
      status: Math.random() > 0.6 ? 'planning' : 'active',
      progress: Math.floor(Math.random() * 100),
      dueDate: '2024-10-30',
      team: 'Branding Team',
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      lastActivity: `${Math.floor(Math.random() * 180)} minutes ago`,
    },
  ],
  '/api/notifications': () => [
    {
      id: Date.now(),
      type: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)],
      title: 'Real-time Update',
      message: `Data refreshed at ${new Date().toLocaleTimeString()}`,
      time: 'Just now',
      unread: true,
    },
  ],
  '/api/stats': () => ({
    totalProjects: Math.floor(Math.random() * 50) + 10,
    activeProjects: Math.floor(Math.random() * 20) + 5,
    completedThisMonth: Math.floor(Math.random() * 15) + 3,
    teamMembers: Math.floor(Math.random() * 30) + 10,
    avgProgress: Math.floor(Math.random() * 100),
    recentActivity: Math.floor(Math.random() * 10) + 1,
  }),
  '/api/activity': () => Array.from({ length: 5 }, (_, i) => ({
    id: Date.now() + i,
    type: ['project_update', 'file_upload', 'comment_added', 'status_change'][Math.floor(Math.random() * 4)],
    title: [
      'Project updated',
      'New file uploaded',
      'Comment added',
      'Status changed'
    ][Math.floor(Math.random() * 4)],
    description: `Activity generated at ${new Date().toLocaleTimeString()}`,
    user: ['John Doe', 'Jane Smith', 'Mike Johnson'][Math.floor(Math.random() * 3)],
    timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
  })),
  '/api/files': () => Array.from({ length: 3 }, (_, i) => ({
    id: Date.now() + i,
    name: `design_file_${i + 1}.${['pdf', 'jpg', 'ai'][Math.floor(Math.random() * 3)]}`,
    size: `${Math.floor(Math.random() * 500) + 100}KB`,
    modifiedAt: new Date(Date.now() - Math.random() * 86400000), // Random time in last day
    modifiedBy: ['Designer A', 'Designer B', 'Client'][Math.floor(Math.random() * 3)],
    type: ['design', 'draft', 'final'][Math.floor(Math.random() * 3)],
  })),
};

// Simulate API call
const fetchData = async (endpoint: string): Promise<any> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Simulate occasional errors (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Network error occurred');
  }

  const generator = mockDataGenerators[endpoint as keyof typeof mockDataGenerators];
  if (generator) {
    return generator();
  }

  // Default mock data
  return {
    timestamp: new Date().toISOString(),
    status: 'success',
    data: `Mock data for ${endpoint}`,
  };
};

export function useRealTimeData<T = any>(config: RealTimeDataConfig): RealTimeDataHook<T> {
  const { user } = useAuth();
  const [state, setState] = useState<RealTimeDataState<T>>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!config.enabled || !user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const rawData = await fetchData(config.endpoint);
      const processedData = config.transform ? config.transform(rawData) : rawData;

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data: processedData,
          isLoading: false,
          lastUpdated: new Date(),
        }));
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }));
      }
    }
  }, [config.endpoint, config.transform, config.enabled, user]);

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      lastUpdated: new Date(),
    }));
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (config.enabled !== false && user) {
      refresh();
    }
  }, [refresh, config.enabled, user]);

  // Set up refresh interval
  useEffect(() => {
    if (config.refreshInterval && config.enabled !== false && user) {
      intervalRef.current = setInterval(refresh, config.refreshInterval * 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refresh, config.refreshInterval, config.enabled, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh,
    setData,
  };
}

// Specialized hooks for different data types
export function useProjectsData() {
  return useRealTimeData({
    endpoint: '/api/projects',
    refreshInterval: 30, // 30 seconds
    enabled: true,
  });
}

export function useNotificationsData() {
  return useRealTimeData({
    endpoint: '/api/notifications',
    refreshInterval: 10, // 10 seconds
    enabled: true,
  });
}

export function useStatsData() {
  return useRealTimeData({
    endpoint: '/api/stats',
    refreshInterval: 60, // 1 minute
    enabled: true,
  });
}

export function useActivityData() {
  return useRealTimeData({
    endpoint: '/api/activity',
    refreshInterval: 15, // 15 seconds
    enabled: true,
  });
}

export function useFilesData() {
  return useRealTimeData({
    endpoint: '/api/files',
    refreshInterval: 45, // 45 seconds
    enabled: true,
  });
}