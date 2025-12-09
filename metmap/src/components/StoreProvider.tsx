'use client';

import { useStoreHydration } from '@/stores/useMetMapStore';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  useStoreHydration();
  return <>{children}</>;
}
