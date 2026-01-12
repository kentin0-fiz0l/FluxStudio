# Contributing to FluxStudio

Thank you for your interest in contributing to FluxStudio! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **PostgreSQL** 15+
- **Redis** 7+ (optional, for caching)
- **Git** 2.30+

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/FluxStudio.git
   cd FluxStudio
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/kentin0-fiz0l/FluxStudio.git
   ```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your local settings
```

See [Environment Setup Guide](./docs/ENVIRONMENT_SETUP.md) for detailed configuration.

### 3. Set Up Database

```bash
# Create database
createdb fluxstudio_dev

# Run migrations
npm run db:migrate
```

### 4. Start Development Servers

```bash
# Start all services (frontend + backend + collaboration)
npm run dev:all

# Or start individually:
npm run dev          # Frontend (Vite on port 5173)
npm run dev:unified  # Backend (Express on port 3001)
npm run dev:collab   # Collaboration service (port 4000)
```

### 5. Verify Setup

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Health check: http://localhost:3001/health

---

## Making Changes

### Branch Naming

Use descriptive branch names:

```
feature/add-dark-mode
fix/login-redirect-bug
docs/update-api-reference
refactor/simplify-auth-flow
test/add-messaging-tests
```

### Workflow

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** following our coding standards

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add dark mode toggle to settings"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**

---

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new frontend code
- Use ES6+ features
- Prefer functional components and hooks in React
- Use meaningful variable and function names

```typescript
// Good
const getUserProfile = async (userId: string): Promise<User> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

// Avoid
const getData = async (id) => {
  const res = await api.get('/users/' + id);
  return res.data;
};
```

### React Components

```typescript
// Component structure
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { ProjectProps } from '@/types';

interface Props {
  projectId: string;
  onUpdate?: (project: Project) => void;
}

export function ProjectCard({ projectId, onUpdate }: Props) {
  // 1. Hooks first
  const [isEditing, setIsEditing] = useState(false);
  const { data: project } = useQuery(['project', projectId], fetchProject);

  // 2. Event handlers
  const handleSave = async () => {
    // ...
  };

  // 3. Render
  return (
    <div className="rounded-lg border p-4">
      {/* ... */}
    </div>
  );
}
```

### CSS/Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use design tokens from `src/tokens/`

```tsx
// Good - Tailwind utilities
<div className="flex items-center gap-4 p-4 rounded-lg bg-card">

// Avoid - inline styles
<div style={{ display: 'flex', alignItems: 'center' }}>
```

### Backend (Node.js)

- Use async/await for asynchronous operations
- Handle errors appropriately
- Validate all inputs
- Use parameterized queries for database operations

```javascript
// Good
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.length < 3) {
      return res.status(400).json({ error: 'Name must be at least 3 characters' });
    }

    const project = await db.query(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    res.status(201).json(project.rows[0]);
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add Google OAuth integration
fix(messaging): resolve duplicate message display
docs(api): update authentication endpoint examples
test(projects): add unit tests for project creation
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run specific test file
npm test -- src/components/Button.test.tsx
```

### Writing Tests

**Unit Tests (Vitest + Testing Library)**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Integration Tests (Jest)**

```javascript
const request = require('supertest');
const app = require('../server');

describe('POST /api/auth/login', () => {
  it('returns 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });
});
```

### Test Coverage Requirements

- Aim for **80%+ coverage** on new code
- All new features should include tests
- Bug fixes should include regression tests

---

## Submitting Changes

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows our coding standards
- [ ] Tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] New features have tests
- [ ] Documentation is updated if needed
- [ ] Commit messages follow conventions
- [ ] PR description explains the changes

### Pull Request Template

```markdown
## Summary
Brief description of the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
```

---

## Review Process

### What We Look For

1. **Correctness**: Does the code do what it's supposed to?
2. **Testing**: Are there appropriate tests?
3. **Performance**: Any performance implications?
4. **Security**: Any security concerns?
5. **Readability**: Is the code clear and maintainable?
6. **Documentation**: Is it documented where needed?

### Response Times

- Initial review: Within 2-3 business days
- Follow-up reviews: Within 1-2 business days

### Addressing Feedback

- Respond to all review comments
- Make requested changes in new commits
- Mark conversations as resolved when addressed
- Request re-review when ready

---

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue with reproduction steps
- **Security Issues**: Email security@fluxstudio.art (do not open public issues)

---

## Recognition

Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- README acknowledgments section

Thank you for contributing to FluxStudio!
