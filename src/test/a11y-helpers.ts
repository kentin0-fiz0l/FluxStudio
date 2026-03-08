import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
import type { ReactElement } from 'react';

expect.extend(matchers);

export async function expectNoA11yViolations(ui: ReactElement) {
  const { container } = render(ui);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
  return results;
}
