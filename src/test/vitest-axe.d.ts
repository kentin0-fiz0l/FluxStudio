import 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line unused-imports/no-unused-vars, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}

declare module '@vitest/expect' {
  // eslint-disable-next-line unused-imports/no-unused-vars
  interface JestAssertion<T> {
    toHaveNoViolations(): void;
  }
}

// Augment @types/jest Matchers (JestMatchers is built from this)
declare global {
  namespace jest {
    // eslint-disable-next-line unused-imports/no-unused-vars
    interface Matchers<R, T = object> {
      toHaveNoViolations(): R;
    }
  }
}
