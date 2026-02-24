/* eslint-disable react-refresh/only-export-components */
/**
 * Asset Core Context - FluxStudio
 *
 * Provides shared state, reducer, and auth helper for all asset contexts.
 * This is the foundation that other asset contexts build upon.
 */

import * as React from 'react';
import { useAuth } from '../AuthContext';
import type { AssetCoreContextValue } from './types';
import { assetsReducer, initialAssetsState } from './types';

const AssetCoreContext = React.createContext<AssetCoreContextValue | null>(null);

export function AssetCoreProvider({ children }: { children: React.ReactNode }) {
  const { user: _user } = useAuth();
  const [state, dispatch] = React.useReducer(assetsReducer, initialAssetsState);

  const getToken = React.useCallback(() => {
    return localStorage.getItem('auth_token');
  }, []);

  const value: AssetCoreContextValue = {
    state,
    dispatch,
    getToken
  };

  return (
    <AssetCoreContext.Provider value={value}>
      {children}
    </AssetCoreContext.Provider>
  );
}

export function useAssetCore(): AssetCoreContextValue {
  const context = React.useContext(AssetCoreContext);

  if (!context) {
    throw new Error('useAssetCore must be used within an AssetCoreProvider');
  }

  return context;
}

export default AssetCoreContext;
