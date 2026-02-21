/**
 * Store Reference Registry
 *
 * Breaks the circular dependency between authSlice and store.
 * store.ts sets the ref after creation; authSlice.ts reads it lazily in hooks.
 */

type AnyStore = (...args: unknown[]) => unknown;

let _useStore: AnyStore | null = null;

export function registerStore(store: AnyStore) {
  _useStore = store;
}

export function getUseStore(): AnyStore {
  if (!_useStore) {
    throw new Error('Store not initialized — getUseStore() called before registerStore()');
  }
  return _useStore;
}
