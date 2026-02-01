/**
 * MetMap Core Context - FluxStudio
 *
 * Provides shared state, reducer, and API helper for all MetMap contexts.
 */

import * as React from 'react';
import { useAuth } from '../AuthContext';
import { getApiUrl } from '../../utils/apiHelpers';
import type { MetMapCoreContextValue } from './types';
import { metmapReducer, initialMetMapState } from './types';

const MetMapCoreContext = React.createContext<MetMapCoreContextValue | null>(null);

export function MetMapCoreProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [state, dispatch] = React.useReducer(metmapReducer, initialMetMapState);

  const apiCall = React.useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = getApiUrl(endpoint);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }, [token]);

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
