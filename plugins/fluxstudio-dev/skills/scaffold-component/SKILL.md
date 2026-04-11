# Scaffold Component

Generate a React TypeScript component following FluxStudio frontend conventions.

## Usage

```
/scaffold-component <ComponentName> [--dir <subdirectory>] [--with-test]
```

## Instructions

When the user invokes this skill, generate a new React component at `src/components/<dir>/<ComponentName>.tsx`.

### Component Pattern

All components MUST follow these conventions:

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
// Import Radix UI primitives from src/components/ui/ as needed
// Import Lucide icons as needed

interface <ComponentName>Props {
  // Define props with explicit TypeScript types
}

export function <ComponentName>({ ...props }: <ComponentName>Props) {
  // Use React hooks for state management
  // Use Tailwind CSS classes for all styling
  // Use Framer Motion for animations
  // Use Radix UI primitives from ../ui/ for interactive elements

  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
}
```

### Key Conventions

1. **Functional components only** - No class components
2. **Named exports** - Use `export function`, not `export default`
3. **TypeScript interfaces** - Define a `Props` interface for every component
4. **Tailwind CSS** - All styling via Tailwind utility classes
5. **Radix UI primitives** - Import from `../ui/` (e.g., `../ui/card`, `../ui/button`, `../ui/dialog`)
6. **Framer Motion** - Use `motion` components for animations and transitions
7. **Lucide icons** - Import icons from `lucide-react`
8. **Zustand** - For client state, use Zustand stores from `../../hooks/` or `../../stores/`
9. **TanStack Query** - For server state, use `useQuery`/`useMutation` from `@tanstack/react-query`

### Available UI Primitives (src/components/ui/)

- `button` - Button with variants
- `card` - Card, CardHeader, CardContent, CardFooter
- `dialog` - Dialog, DialogTrigger, DialogContent
- `input` - Styled input
- `label` - Styled label
- `select` - Select, SelectTrigger, SelectContent, SelectItem
- `tabs` - Tabs, TabsList, TabsTrigger, TabsContent
- `tooltip` - Tooltip, TooltipTrigger, TooltipContent

### Test File (when --with-test is specified)

Generate a Vitest test file at `src/components/<dir>/<ComponentName>.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { <ComponentName> } from './<ComponentName>';

describe('<ComponentName>', () => {
  it('renders without crashing', () => {
    render(<<ComponentName> />);
    // Add assertions based on component content
  });
});
```

## Output

1. Component file at `src/components/<dir>/<ComponentName>.tsx`
2. (Optional) Test file at `src/components/<dir>/<ComponentName>.test.tsx`
