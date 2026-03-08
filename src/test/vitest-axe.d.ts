import 'vitest';
import type { AxeResults } from 'axe-core';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

declare module '@vitest/expect' {
  interface JestAssertion<T> {
    toHaveNoViolations(): void;
  }
}

// Augment @types/jest Matchers (JestMatchers is built from this)
declare global {
  namespace jest {
    interface Matchers<R, T = {}> {
      toHaveNoViolations(): R;
    }
  }
}
