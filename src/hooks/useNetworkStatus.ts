/**
 * useNetworkStatus Hook
 *
 * Simple hook for tracking network connectivity.
 * Provides real-time online/offline status.
 */

import * as React from 'react';

export type NetworkQuality = 'online' | 'offline' | 'slow';

interface UseNetworkStatusReturn {
  isOnline: boolean;
  quality: NetworkQuality;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  const [connectionInfo, setConnectionInfo] = React.useState<{
    effectiveType: string | null;
    downlink: number | null;
    rtt: number | null;
    saveData: boolean;
  }>({
    effectiveType: null,
    downlink: null,
    rtt: null,
    saveData: false,
  });

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API
    const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;

    if (connection) {
      const updateConnectionInfo = () => {
        setConnectionInfo({
          effectiveType: connection.effectiveType || null,
          downlink: connection.downlink ?? null,
          rtt: connection.rtt ?? null,
          saveData: connection.saveData ?? false,
        });
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine quality based on connection info
  const quality = React.useMemo((): NetworkQuality => {
    if (!isOnline) return 'offline';

    if (connectionInfo.effectiveType) {
      if (['slow-2g', '2g'].includes(connectionInfo.effectiveType)) {
        return 'slow';
      }
    }

    if (connectionInfo.downlink !== null && connectionInfo.downlink < 1) {
      return 'slow';
    }

    if (connectionInfo.rtt !== null && connectionInfo.rtt > 500) {
      return 'slow';
    }

    return 'online';
  }, [isOnline, connectionInfo]);

  return {
    isOnline,
    quality,
    ...connectionInfo,
  };
}

// Type for Network Information API
interface NetworkConnection {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export default useNetworkStatus;
