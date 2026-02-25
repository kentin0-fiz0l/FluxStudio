/* eslint-disable react-refresh/only-export-components */
/**
 * MetMap Core Context - FluxStudio
 *
 * Provides shared state, reducer, and API helper for all MetMap contexts.
 */

import * as React from 'react';
import { apiService } from '@/services/apiService';
import type { MetMapCoreContextValue } from './types';
import { metmapReducer, initialMetMapState } from './types';

const MetMapCoreContext = React.createContext<MetMapCoreContextValue | null>(null);

export function MetMapCoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(metmapReducer, initialMetMapState);

  const apiCall = React.useCallback(async <T = Record<string, unknown>>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body as string) : undefined;

    let result;
    switch (method) {
      case 'POST':
        result = await apiService.post<T>(endpoint, body);
        break;
      case 'PUT':
      case 'PATCH':
        result = await apiService.patch<T>(endpoint, body);
        break;
      case 'DELETE':
        result = await apiService.delete<T>(endpoint);
        break;
      default:
        result = await apiService.get<T>(endpoint);
    }
    return result.data as T;
  }, []);

  const value: MetMapCoreContextValue = {
    state,
    dispatch,
    apiCall
  };

  return (
    <MetMapCoreContext.Provider value={value}>
      {children}
    </MetMapCoreContext.Provider>
  );
}

export function useMetMapCore(): MetMapCoreContextValue {
  const context = React.useContext(MetMapCoreContext);

  if (!context) {
    throw new Error('useMetMapCore must be used within a MetMapCoreProvider');
  }

  return context;
}

export default MetMapCoreContext;
