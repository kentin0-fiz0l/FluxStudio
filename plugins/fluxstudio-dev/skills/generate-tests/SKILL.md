# Generate Tests

Auto-generate test files for existing FluxStudio source files.

## Usage

```
/generate-tests <file-path> [--type unit|integration|e2e]
```

## Instructions

When the user invokes this skill, read the target source file and generate appropriate tests based on the file type and location.

### Test Framework Selection

FluxStudio uses a dual test framework. Select the correct one based on file location and type:

| Source Location | Test Type | Framework | Test Location | Extension |
|----------------|-----------|-----------|---------------|-----------|
| `src/**/*.ts` | Unit | Vitest | `src/**/*.test.ts` | `.test.ts` |
| `src/**/*.tsx` | Unit | Vitest | `src/**/*.test.tsx` | `.test.tsx` |
| `routes/*.js` | Integration | Jest | `tests/<route>.test.js` | `.test.js` |
| `lib/**/*.js` | Integration | Jest | `tests/<module>.test.js` | `.test.js` |
| Any | E2E | Playwright | `tests/e2e/<feature>.spec.ts` | `.spec.ts` |

### Vitest Unit Tests (Frontend)

For React components and TypeScript modules:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ModuleName', () => {
  it('should describe expected behavior', () => {
    // Arrange, Act, Assert
  });
});
```

### Jest Integration Tests (Backend)

For Express routes and backend modules:

```javascript
const request = require('supertest');
const app = require('../server-unified');

describe('POST /api/<route>', () => {
  let authToken;

  beforeAll(async () => {
    // Set up test auth token
  });

  it('should return 200 with valid data', async () => {
    const res = await request(app)
      .post('/api/<route>')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ /* test data */ });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/<route>')
      .send({ /* test data */ });

    expect(res.status).toBe(401);
  });

  it('should return 400 with invalid data', async () => {
    const res = await request(app)
      .post('/api/<route>')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ /* invalid data */ });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

### Playwright E2E Tests

For end-to-end user flow tests:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete user flow', async ({ page }) => {
    // Navigate, interact, assert
  });
});
```

### Test Generation Guidelines

1. **Read the source file first** - Understand exports, functions, and behavior
2. **Test public API** - Focus on exported functions and component props
3. **Happy path + edge cases** - Include both success and failure scenarios
4. **Mock external deps** - Use `vi.mock()` (Vitest) or `jest.mock()` (Jest) for external services
5. **Test error responses** - Verify error codes and messages match the `{ success: false, error, code }` format
6. **Auth tests** - For routes, always test authenticated and unauthenticated access
7. **Zod validation** - For routes with zodValidate, test schema validation failures

## Output

1. Test file at the appropriate location based on framework selection
2. Summary of what was tested and any manual setup required
